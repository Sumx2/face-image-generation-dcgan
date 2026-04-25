import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Sparkles, Image as ImageIcon, Loader2, Layers, RefreshCw, BarChart2, Activity, SplitSquareHorizontal, Play, Pause, SkipForward, SkipBack, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = 'http://localhost:8000';

function App() {
  const [images, setImages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(4);
  const [seed, setSeed] = useState("");
  
  const [activeTab, setActiveTab] = useState('generate'); // 'generate', 'analysis', 'metrics'
  
  // Analysis & Metrics State
  const [realImages, setRealImages] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [metricsData, setMetricsData] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [interpolationImages, setInterpolationImages] = useState([]);
  const [interpolationLoading, setInterpolationLoading] = useState(false);
  
  // Epochs progression state
  const [epochsData, setEpochsData] = useState([]);
  const [currentEpochIndex, setCurrentEpochIndex] = useState(0);
  const [epochsLoading, setEpochsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load history from local storage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('dcgan_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Fetch data based on tab selection
  useEffect(() => {
    if (activeTab === 'metrics') {
      if (metricsData.length === 0) fetchMetrics();
      if (epochsData.length === 0) fetchEpochs();
    } else if (activeTab === 'analysis' && realImages.length === 0) {
      fetchAnalysisData();
    }
  }, [activeTab, metricsData.length, epochsData.length, realImages.length]);

  const fetchEpochs = async () => {
    setEpochsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/epochs`);
      setEpochsData(response.data.epochs);
      if (response.data.epochs.length > 0) {
        setCurrentEpochIndex(response.data.epochs.length - 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEpochsLoading(false);
    }
  };

  const fetchAnalysisData = async () => {
    setAnalysisLoading(true);
    try {
      // If we don't have generated images for comparison, generate some
      if (images.length === 0) {
        await handleGenerate();
      }
      const response = await axios.get(`${API_URL}/real-images?count=${count}`);
      setRealImages(response.data.images);
      
      if (interpolationImages.length === 0) {
          fetchInterpolation();
      }
    } catch (err) {
      console.error(err);
      // Fall silent on error, handled in UI
    } finally {
      setAnalysisLoading(false);
    }
  };

  const fetchInterpolation = async () => {
      setInterpolationLoading(true);
      try {
          const response = await axios.get(`${API_URL}/interpolate?steps=8`);
          setInterpolationImages(response.data.images);
      } catch (err) {
          console.error(err);
      } finally {
          setInterpolationLoading(false);
      }
  };

  const fetchMetrics = async () => {
    setMetricsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/metrics`);
      setMetricsData(response.data.metrics);
    } catch (err) {
      console.error(err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({ 
        count: count.toString()
      });
      if (seed && !isNaN(parseInt(seed))) {
          queryParams.append("seed", parseInt(seed).toString());
      }
      const response = await axios.get(`${API_URL}/generate?${queryParams}`);
      const newImages = response.data.images;
      setImages(newImages);
      
      // Update history
      const updatedHistory = [...newImages, ...history].slice(0, 50); // Keep last 50
      setHistory(updatedHistory);
      localStorage.setItem('dcgan_history', JSON.stringify(updatedHistory));
      
      // Also refresh real images if we're on the analysis tab
      if (activeTab === 'analysis') {
        const realResp = await axios.get(`${API_URL}/real-images?count=${count}`);
        setRealImages(realResp.data.images);
      }
      
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to connect to the generator server. Is the FastAPI backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (imgDataUri, index) => {
    const link = document.createElement('a');
    link.href = imgDataUri;
    link.download = `celebA_generated_${Date.now()}_${index}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('dcgan_history');
  };

  // Auto-play effect for the epoch progression slider
  useEffect(() => {
    let interval;
    if (isPlaying && epochsData.length > 0) {
      interval = setInterval(() => {
        setCurrentEpochIndex((prev) => {
          if (prev >= epochsData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 300); // 300ms per epoch
    }
    return () => clearInterval(interval);
  }, [isPlaying, epochsData.length]);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-white font-medium mb-2">Epoch {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {entry.value.toFixed(4)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
      
      {/* Decorative blurred background elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-6xl flex flex-col items-center">
        
        {/* Header section */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-indigo-500/10 text-indigo-400 mb-6 border border-indigo-500/20">
            <Sparkles className="w-6 h-6 mr-2" />
            <span className="font-semibold tracking-wider text-sm uppercase">AI Powered Vision</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-6 text-glow">
            Neural Face Synthesizer
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-400 leading-relaxed font-light">
            Generate highly realistic human faces modeled on the CelebA dataset. Powered by a Deep Convolutional Generative Adversarial Network (DCGAN).
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 bg-slate-900/50 p-1 rounded-2xl border border-white/10 mb-10">
          <button 
            onClick={() => setActiveTab('generate')}
            className={`px-6 py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'generate' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <ImageIcon className="w-4 h-4" /> Workspace
          </button>
          <button 
            onClick={() => setActiveTab('analysis')}
            className={`px-6 py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'analysis' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <SplitSquareHorizontal className="w-4 h-4" /> Real vs Fake
          </button>
          <button 
            onClick={() => setActiveTab('metrics')}
            className={`px-6 py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'metrics' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Activity className="w-4 h-4" /> Model Metrics
          </button>
        </div>

        {/* =========================================
            TAB CONTENT: GENERATE WORKSPACE
            ========================================= */}
        {activeTab === 'generate' && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            {/* Controls Section */}
            <div className="glass-panel w-full max-w-md rounded-3xl p-6 mb-12 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 flex items-center justify-between bg-slate-950/50 border border-white/5 rounded-2xl p-2 px-4 w-full">
                <label className="text-slate-400 font-medium text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Count:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 4, 8].map(num => (
                    <button
                      key={num}
                      onClick={() => setCount(num)}
                      className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${count === num ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                
                <div className="h-6 w-px bg-white/10 mx-1"></div>
                
                <label className="text-slate-400 font-medium text-xs flex items-center gap-1">Seed:</label>
                <input 
                  type="number"
                  placeholder="Rndm"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            
            <div className="mb-12">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 rounded-2xl font-bold text-lg transition-all hover:bg-indigo-50 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] whitespace-nowrap"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <><RefreshCw className="w-5 h-5" /> Generate</>
                )}
              </button>
            </div>

            {error && (
              <div className="w-full max-w-md mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Current Generation Display */}
            {images.length > 0 && (
              <div className="w-full mb-16">
                <h2 className="text-2xl font-bold mb-6 text-white/90 flex items-center border-b border-white/10 pb-4">
                  <ImageIcon className="w-6 h-6 mr-3 text-indigo-400" />
                  Generated Output
                </h2>
                <div className={`grid gap-6 ${images.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2 md:grid-cols-4'}`}>
                  {images.map((img, idx) => (
                    <div key={idx} className="group relative rounded-2xl overflow-hidden glass-panel aspect-square img-glow">
                      <img src={img} alt="Generated Face" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <button
                          onClick={() => handleDownload(img, idx)}
                          className="w-full py-2 bg-indigo-500/90 hover:bg-indigo-400 text-white rounded-xl font-medium flex items-center justify-center gap-2 backdrop-blur-sm transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Save HD
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History Gallery */}
            {history.length > 0 && (
              <div className="w-full mt-8 pt-10 border-t border-white/10">
                <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                  <h2 className="text-xl font-semibold text-slate-400 flex items-center">History Showcase</h2>
                  <button onClick={clearHistory} className="text-sm text-slate-500 hover:text-red-400 transition-colors">
                    Clear History
                  </button>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {history.map((img, idx) => (
                    <div key={idx} className="group relative rounded-xl overflow-hidden bg-slate-900 border border-white/5 aspect-square">
                      <img src={img} alt={`History ${idx}`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-300" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 flex items-center justify-center">
                        <button onClick={() => handleDownload(img, idx)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md text-white transition-colors" title="Download">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}


        {/* =========================================
            TAB CONTENT: REAL VS FAKE ANALYSIS
            ========================================= */}
        {activeTab === 'analysis' && (
          <div className="w-full max-w-5xl animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-slate-900/60 p-6 rounded-2xl border border-white/5">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                  <SplitSquareHorizontal className="text-indigo-400" />
                  Visual Analysis
                </h2>
                <p className="text-slate-400">Compare the model's generated images directly against authentic samples from the CelebA dataset.</p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading || analysisLoading}
                className="mt-4 md:mt-0 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                {(loading || analysisLoading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Resample Batch
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Fake Images Column */}
              <div className="glass-panel p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="text-purple-400 w-5 h-5" /> Generated (Fake)
                  </h3>
                  <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-1 rounded">DCGAN Output</span>
                </div>
                
                {images.length > 0 ? (
                  <div className={`grid gap-4 ${images.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2'}`}>
                    {images.map((img, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden aspect-square border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] relative group">
                        <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Fake Face" />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded">Gen</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-xl text-slate-500">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <p>No images generated yet.</p>
                  </div>
                )}
              </div>

              {/* Real Images Column */}
              <div className="glass-panel p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ImageIcon className="text-emerald-400 w-5 h-5" /> Authentic (Real)
                  </h3>
                  <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">CelebA Dataset</span>
                </div>
                
                {realImages.length > 0 ? (
                  <div className={`grid gap-4 ${realImages.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2'}`}>
                    {realImages.map((img, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden aspect-square border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] relative group">
                        <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Real Face" />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded">Real</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-xl text-slate-500">
                     {analysisLoading ? <Loader2 className="w-8 h-8 mb-2 animate-spin text-emerald-500" /> : <ImageIcon className="w-8 h-8 mb-2 opacity-50" />}
                     <p>{analysisLoading ? "Loading dataset..." : "Dataset not found or empty."}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Latent Space Interpolation */}
            <div className="mt-8 glass-panel p-6 rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Zap className="text-yellow-400 w-5 h-5" /> Latent Space Interpolation
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">Proof that the AI learned a smooth "manifold" of faces, not just memorization. Watch it smoothly transition from Face A to Face B.</p>
                </div>
                <button
                  onClick={fetchInterpolation}
                  disabled={interpolationLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                >
                  {interpolationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Generate New Path
                </button>
              </div>
              
              {interpolationImages.length > 0 ? (
                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl overflow-x-auto gap-2 border border-white/5">
                  {interpolationImages.map((img, idx) => (
                    <div key={idx} className={`shrink-0 rounded-lg overflow-hidden border ${idx === 0 || idx === interpolationImages.length - 1 ? 'border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)] scale-105 z-10' : 'border-white/10 opacity-80'} aspect-square w-16 md:w-20 lg:w-24 transition-transform`}>
                      <img src={img} alt={`Interpolation frame ${idx}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl text-slate-500">
                  {interpolationLoading ? "Calculating latent path..." : "No interpolation generated."}
                </div>
              )}
            </div>

            {/* Interpretability Insights */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5">
                 <p className="text-slate-400 text-xs mb-1">Architecture</p>
                 <p className="text-white font-medium">DCGAN</p>
               </div>
               <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5">
                 <p className="text-slate-400 text-xs mb-1">Latent Vector (Z_DIM)</p>
                 <p className="text-white font-medium">100</p>
               </div>
               <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5">
                 <p className="text-slate-400 text-xs mb-1">Resolution</p>
                 <p className="text-white font-medium">64x64x3</p>
               </div>
               <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5">
                 <p className="text-slate-400 text-xs mb-1">Features (Gen/Disc)</p>
                 <p className="text-white font-medium">64 / 64</p>
               </div>
            </div>
          </div>
        )}

        {/* =========================================
            TAB CONTENT: MODEL METRICS
            ========================================= */}
        {activeTab === 'metrics' && (
          <div className="w-full max-w-5xl animate-fade-in">
            <div className="mb-8 bg-slate-900/60 p-6 rounded-2xl border border-white/5">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                <BarChart2 className="text-blue-400" />
                Training Loss Curves
              </h2>
              <p className="text-slate-400 text-sm">
                A visual representation of the adversarial training process. A successful GAN training typically shows the Generator and Discriminator losses oscillating and converging to a stable equilibrium over time.
              </p>
            </div>

            {metricsData.length > 0 && (
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-purple-500">
                  <p className="text-slate-400 text-sm mb-1">Final Generator Loss</p>
                  <p className="text-3xl font-bold text-white">{metricsData[metricsData.length - 1].loss_g.toFixed(4)}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-blue-500">
                  <p className="text-slate-400 text-sm mb-1">Final Discriminator Loss</p>
                  <p className="text-3xl font-bold text-white">{metricsData[metricsData.length - 1].loss_d.toFixed(4)}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-emerald-500">
                  <p className="text-slate-400 text-sm mb-1">Equilibrium Status</p>
                  <p className="text-xl font-bold text-emerald-400">Converged</p>
                </div>
              </div>
            )}

            <div className="glass-panel p-6 rounded-3xl mb-8">
              {metricsLoading ? (
                <div className="h-96 flex flex-col items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                  <p className="text-slate-400">Loading metrics data...</p>
                </div>
              ) : metricsData.length > 0 ? (
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={metricsData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                      <XAxis 
                        dataKey="epoch" 
                        stroke="#94a3b8" 
                        tick={{fill: '#94a3b8', fontSize: 12}}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Epochs', position: 'insideBottomRight', offset: -10, fill: '#94a3b8' }}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        tick={{fill: '#94a3b8', fontSize: 12}}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Loss (BCE)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line 
                        type="monotone" 
                        name="Generator Loss" 
                        dataKey="loss_g" 
                        stroke="#a855f7" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, fill: '#a855f7', stroke: '#0f172a', strokeWidth: 2 }} 
                      />
                      <Line 
                        type="monotone" 
                        name="Discriminator Loss" 
                        dataKey="loss_d" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-slate-500">
                  <Activity className="w-10 h-10 mb-4 opacity-50" />
                  <p>No training metrics found in logs.</p>
                </div>
              )}
            </div>
            
            {/* Training Progression Timeline */}
            <div className="glass-panel p-6 rounded-3xl mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="text-pink-400 w-5 h-5" /> Training Progression
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">Watch how the generator learns from pure noise to structured faces across epochs.</p>
                </div>
              </div>
              
              {epochsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-500 mb-4" />
                  <p className="text-slate-400">Loading progression data...</p>
                </div>
              ) : epochsData.length > 0 ? (
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="w-full md:w-1/2 flex justify-center">
                    <div className="rounded-2xl overflow-hidden border-2 border-white/10 relative shadow-2xl">
                      <img 
                        src={`${API_URL}${epochsData[currentEpochIndex].url}`} 
                        alt={`Epoch ${epochsData[currentEpochIndex].epoch}`}
                        className="w-full max-w-[400px] h-auto object-contain bg-black"
                      />
                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg text-white font-mono text-sm border border-white/20">
                        Epoch {epochsData[currentEpochIndex].epoch}
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-1/2 flex flex-col gap-6">
                    <div className="flex items-center justify-center gap-4">
                      <button 
                        onClick={() => setCurrentEpochIndex(0)} 
                        disabled={currentEpochIndex === 0}
                        className="p-2 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        <SkipBack className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)} 
                        className="p-4 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 transition-all shadow-lg"
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                      </button>
                      <button 
                        onClick={() => setCurrentEpochIndex(epochsData.length - 1)} 
                        disabled={currentEpochIndex === epochsData.length - 1}
                        className="p-2 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="w-full relative">
                      <input 
                        type="range" 
                        min="0" 
                        max={epochsData.length - 1} 
                        value={currentEpochIndex} 
                        onChange={(e) => {
                          setCurrentEpochIndex(parseInt(e.target.value));
                          setIsPlaying(false);
                        }}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                        <span>Ep 0</span>
                        <span>Ep {epochsData[epochsData.length - 1]?.epoch}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 border border-dashed border-white/10 rounded-xl">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                  <p>No epoch progression images found. Make sure outputs are downloaded.</p>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div> Generator Goal
                </h4>
                <p className="text-sm text-slate-400">
                  The Generator tries to maximize the Discriminator's error. When the Generator loss decreases, it means it is successfully "fooling" the Discriminator by producing more realistic images.
                </p>
              </div>
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div> Discriminator Goal
                </h4>
                <p className="text-sm text-slate-400">
                  The Discriminator tries to minimize its error in classifying real vs fake. If this loss gets too close to 0, the Discriminator has overpowered the Generator, halting learning.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default App;
