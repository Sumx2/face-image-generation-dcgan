#!/bin/bash

echo "Starting Jarvis Labs Setup..."

# Install dependencies (Jarvis already has PyTorch, we just need Kaggle and extra tools)
pip install -r requirements.txt
pip install kaggle pandas matplotlib tqdm

echo "--------------------------------------------------------"
echo "ATTENTION: You must upload your 'kaggle.json' file to the root of this project before proceeding!"
echo "If you haven't done so, press Ctrl+C to stop, upload the file, and run this script again."
echo "Press ENTER to continue..."
read

# Setup Kaggle credentials
mkdir -p ~/.kaggle
cp kaggle.json ~/.kaggle/
chmod 600 ~/.kaggle/kaggle.json

echo "Downloading CelebA dataset from Kaggle (this will be very fast on Jarvis)..."
mkdir -p dataset
cd dataset
kaggle datasets download jessicali9530/celeba-dataset
echo "Extracting CelebA dataset..."
unzip -q celeba-dataset.zip -d celeba/
rm celeba-dataset.zip
cd ..

echo "Setup Complete! You can now start training with: python training/train.py"
