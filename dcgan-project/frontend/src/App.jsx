import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Sparkles, Image as ImageIcon, Loader2, Layers, RefreshCw } from 'lucide-react';

const API_URL = 'http://localhost:8000/generate';

function App() {
  const [images, setImages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(1);
  const [seed, setSeed] = useState("");
  const [male, setMale] = useState(false);
  const [smiling, setSmiling] = useState(false);
  const [glasses, setGlasses] = useState(false);

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

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({ 
        count: count.toString(),
        male: male.toString(),
        smiling: smiling.toString(),
        glasses: glasses.toString()
      });
      if (seed && !isNaN(parseInt(seed))) {
          queryParams.append("seed", parseInt(seed).toString());
      }
      const response = await axios.get(`${API_URL}?${queryParams}`);
      const newImages = response.data.images;
      setImages(newImages);
      
      // Update history
      const updatedHistory = [...newImages, ...history].slice(0, 50); // Keep last 50
      setHistory(updatedHistory);
      localStorage.setItem('dcgan_history', JSON.stringify(updatedHistory));
      
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

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
      
      {/* Decorative blurred background elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-5xl flex flex-col items-center">
        
        {/* Header section */}
        <div className="text-center mb-12 animate-fade-in">
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

        {/* Controls Section */}
        <div className="glass-panel w-full max-w-md rounded-3xl p-6 mb-12 animate-fade-in flex flex-col sm:flex-row items-center gap-4">
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

        {/* Attribute Toggles */}
        <div className="glass-panel w-full max-w-sm rounded-3xl p-4 mb-10 flex justify-between items-center bg-slate-950/40 animate-fade-in shadow-xl border border-indigo-500/10">
           <label className="flex items-center cursor-pointer gap-2 select-none group">
             <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${male ? 'bg-indigo-500' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
               <input type="checkbox" className="hidden" checked={male} onChange={() => setMale(!male)} />
               {male && <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>}
             </div>
             <span className={`text-sm font-medium ${male ? 'text-white' : 'text-slate-400'}`}>Male</span>
           </label>
           
           <label className="flex items-center cursor-pointer gap-2 select-none group">
             <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${smiling ? 'bg-indigo-500' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
               <input type="checkbox" className="hidden" checked={smiling} onChange={() => setSmiling(!smiling)} />
               {smiling && <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>}
             </div>
             <span className={`text-sm font-medium ${smiling ? 'text-white' : 'text-slate-400'}`}>Smiling</span>
           </label>
           
           <label className="flex items-center cursor-pointer gap-2 select-none group">
             <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${glasses ? 'bg-indigo-500' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
               <input type="checkbox" className="hidden" checked={glasses} onChange={() => setGlasses(!glasses)} />
               {glasses && <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>}
             </div>
             <span className={`text-sm font-medium ${glasses ? 'text-white' : 'text-slate-400'}`}>Glasses</span>
           </label>
        </div>
        
        <div className="mb-12 animate-fade-in">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 rounded-2xl font-bold text-lg transition-all hover:bg-indigo-50 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Generate
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="w-full max-w-md mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* Current Generation Display */}
        {images.length > 0 && (
          <div className="w-full mb-16 animate-fade-in">
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
          <div className="w-full mt-8 pt-10 border-t border-white/10 animate-fade-in">
             <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-semibold text-slate-400 flex items-center">
                 History Showcase
              </h2>
              <button 
                onClick={clearHistory}
                className="text-sm text-slate-500 hover:text-red-400 transition-colors"
              >
                Clear History
              </button>
             </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {history.map((img, idx) => (
                <div key={idx} className="group relative rounded-xl overflow-hidden bg-slate-900 border border-white/5 aspect-square">
                  <img src={img} alt={`History ${idx}`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-300" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 flex items-center justify-center">
                    <button 
                      onClick={() => handleDownload(img, idx)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md text-white transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
