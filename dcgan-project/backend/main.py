from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import torch
import os
from pydantic import BaseModel
from typing import List

from model import Generator, Z_DIM, CHANNELS_IMG, FEATURES_GEN
from utils import tensor_to_base64_images

app = FastAPI(title="DCGAN Face Generator API")

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
def generate_faces(count: int = Query(1, ge=1, le=16, description="Number of faces to generate")):
    """
    Generate random face images using the DCGAN model.
    Count determines how many images to return (max 16 to avoid overload).
    """
    if generator is None:
        raise HTTPException(status_code=500, detail="Generator model not properly initialized.")
        
    try:
        # Generate random noise
        noise = torch.randn(count, Z_DIM, 1, 1).to(DEVICE)
        
        # Inference
        with torch.no_grad():
            fake_tensors = generator(noise)
            
        # Convert output to Base64
        base64_list = tensor_to_base64_images(fake_tensors)
        
        return {"images": base64_list}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
