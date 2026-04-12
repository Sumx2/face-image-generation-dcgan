# Neural Face Synthesizer (DCGAN on CelebA)

A complete end-to-end full-stack AI project for generating realistic human faces using a Deep Convolutional Generative Adversarial Network (DCGAN). 

![DCGAN Project](https://github.com/lucide-icons/lucide/raw/main/icons/sparkles.svg)

## Overview
This project comprises:
1. **PyTorch Training Engine**: A script to automatically download the CelebA dataset and train a Generator and Discriminator from scratch to produce 64x64 face images.
2. **FastAPI Backend**: A highly performant REST API that loads the trained PyTorch model and serves generated faces dynamically via Base64 data URIs.
3. **React + Tailwind Frontend**: A sleek, premium web interface to generate, view, and save single or multiple faces, with a persistent browser history.

## What is a DCGAN?
A Deep Convolutional GAN (DCGAN) is a generative model consisting of two opposing neural networks:
* **The Generator**: Creates fake images from random noise. 
* **The Discriminator**: Tries to distinguish between the real images (from CelebA) and the fake ones created by the Generator.
Through an adversarial training loop, the Generator gets incredibly good at creating realistic images that fool the Discriminator.

---

## Prerequisites
* Python 3.9+
* Node.js 18+
* (Optional but recommended) NVIDIA GPU with CUDA installed for training.

---

## Dataset link : https://www.kaggle.com/datasets/jessicali9530/celeba-dataset

## Step 1: Model Setup & Training

First, navigate to the `training` directory:
```bash
cd dcgan-project/training
```

### 1a (Optional): Create a mock model to test UI instantly
If you don't want to wait hours for the model to train before seeing the UI work, run the mock generator script. This will create a `generator.pth` filled with random weights (it will generate TV static noise).
```bash
python create_mock_model.py
```

### 1b: Full Training on CelebA
Install ML requirements and start the training process. The script uniquely attempts to download the CelebA dataset via torchvision (if it cannot reach google drive, you may have to download CelebA manually and place it in `dataset/celeba`).
```bash
pip install -r requirements.txt
python train.py
```
> Training will produce sample outputs in `training/outputs/` per epoch. Once finished, it will output `generator.pth` to the root folder.

---

## Step 2: Running the FastAPI Backend

Navigate to the `backend` directory from the project root:
```bash
cd dcgan-project/backend
```

Install the requirements and run the API using `uvicorn`:
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```
The API is now running at `http://localhost:8000`. It will attempt to load `generator.pth` from the parent directory.

---

## Step 3: Running the React Frontend

Navigate to the `frontend` directory:
```bash
cd dcgan-project/frontend
```

Install dependencies and start the Vite dev server:
```bash
npm install
npm run dev
```

Visit the Local address provided by Vite (e.g., `http://localhost:5173`) in your browser to interact with the Neural Face Synthesizer!

### Demo Features
* Toggle "Count" between 1, 4, or 8 to perform **Single or Multiple Image Generation**.
* Click **Generate** and watch the seamless animations.
* Hover any newly generated output and click **Save HD** for direct download to your PC.
* Scroll down to view the **History Showcase** built using LocalStorage to persist your favorite generations.