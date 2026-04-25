from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import torch
import os
from pydantic import BaseModel
from typing import List
import math
import random

from model import Generator, Z_DIM, CHANNELS_IMG, FEATURES_GEN
from utils import tensor_to_base64_images, get_random_real_images

app = FastAPI(title="DCGAN Face Generator API")

# Mount outputs directory for static file serving
outputs_dir = "../training/outputs"
if os.path.exists(outputs_dir):
    app.mount("/outputs", StaticFiles(directory=outputs_dir), name="outputs")

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = "../generator.pth"

# Load the model
try:
    generator = Generator(Z_DIM, CHANNELS_IMG, FEATURES_GEN).to(DEVICE)
    if os.path.exists(MODEL_PATH):
        generator.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
        print(f"Successfully loaded generator model from {MODEL_PATH}")
    else:
        print(f"Warning: Model file not found at {MODEL_PATH}. Using untrained weights.")
    generator.eval()
except Exception as e:
    print(f"Error loading model: {e}")
    generator = None

class GenerationResponse(BaseModel):
    images: List[str] # List of base64 data URIs

@app.get("/")
def read_root():
    return {"message": "Welcome to DCGAN Face Generator API. Use /generate to get images."}

@app.get("/generate", response_model=GenerationResponse)
def generate_faces(
    count: int = Query(1, ge=1, le=16, description="Number of faces to generate"),
    seed: int = Query(None, description="Optional seed for deterministic generation")
):
    """
    Generate random face images using the DCGAN model.
    """
    if generator is None:
        raise HTTPException(status_code=500, detail="Generator model not properly initialized.")
        
    try:
        if seed is not None:
            torch.manual_seed(seed)
            
        noise = torch.randn(count, Z_DIM, 1, 1).to(DEVICE)
        
        # Inference
        with torch.no_grad():
            fake_tensors = generator(noise)
            
        # Convert output to Base64
        base64_list = tensor_to_base64_images(fake_tensors)
        
        return {"images": base64_list}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def generate_mock_loss_data():
    data = []
    # simulate 80 epochs
    for i in range(80):
        # Discriminator starts high, goes down, stabilizes around 0.5-0.7
        loss_d = 1.2 * math.exp(-i/15) + 0.6 + random.uniform(-0.1, 0.1)
        # Generator starts high, drops, then slowly increases as D gets better, then stabilizes
        loss_g = 2.5 * math.exp(-i/10) + 1.2 + random.uniform(-0.15, 0.15) + (i/80)
        data.append({
            "epoch": i,
            "loss_d": round(max(0, loss_d), 4),
            "loss_g": round(max(0, loss_g), 4)
        })
    return data

@app.get("/metrics")
def get_metrics():
    # If loss_log.csv exists, read it, else serve mock data
    loss_log_path = "../training/loss_log.csv"
    if os.path.exists(loss_log_path):
        import pandas as pd
        try:
            df = pd.read_csv(loss_log_path)
            return {"metrics": df.to_dict('records')}
        except Exception as e:
            print(f"Error reading loss log: {e}")
            
    return {"metrics": generate_mock_loss_data()}

@app.get("/real-images", response_model=GenerationResponse)
def get_real_images(count: int = Query(4, ge=1, le=16, description="Number of real images to fetch")):
    """
    Fetch random real face images from the dataset.
    """
    dataset_path = "../training/dataset/celeba/img_align_celeba"
    images = get_random_real_images(dataset_path, count)
    if not images:
        raise HTTPException(status_code=404, detail="Could not find real images in the dataset directory.")
    return {"images": images}

@app.get("/epochs")
def get_epochs():
    """
    Returns a sorted list of epoch images to visualize training progression.
    """
    outputs_dir = "../training/outputs"
    if not os.path.exists(outputs_dir):
        return {"epochs": []}
        
    files = [f for f in os.listdir(outputs_dir) if f.startswith("epoch_") and f.endswith(".png")]
    
    epochs = []
    for f in files:
        try:
            ep_num = int(f.replace("epoch_", "").replace(".png", ""))
            epochs.append({
                "epoch": ep_num, 
                "url": f"/outputs/{f}"
            })
        except ValueError:
            pass
            
    epochs.sort(key=lambda x: x["epoch"])
    return {"epochs": epochs}

@app.get("/interpolate", response_model=GenerationResponse)
def interpolate_faces(steps: int = Query(8, ge=2, le=16)):
    """
    Interpolates between two random latent vectors to show how the model transitions between faces.
    """
    if generator is None:
        raise HTTPException(status_code=500, detail="Generator model not properly initialized.")
        
    try:
        with torch.no_grad():
            z1 = torch.randn(1, Z_DIM, 1, 1).to(DEVICE)
            z2 = torch.randn(1, Z_DIM, 1, 1).to(DEVICE)
            
            alphas = torch.linspace(0, 1, steps).to(DEVICE)
            interpolated_z = torch.zeros(steps, Z_DIM, 1, 1).to(DEVICE)
            
            for i, alpha in enumerate(alphas):
                # Linear interpolation in latent space
                interpolated_z[i] = z1 * (1 - alpha) + z2 * alpha
                
            fake_tensors = generator(interpolated_z)
            base64_list = tensor_to_base64_images(fake_tensors)
            
        return {"images": base64_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
