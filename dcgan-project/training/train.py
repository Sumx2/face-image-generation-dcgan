import torch
import torch.nn as nn
import torch.optim as optim
import torchvision
import torchvision.datasets as datasets
import torchvision.transforms as transforms
from torch.utils.data import DataLoader
from model import Discriminator, Generator, initialize_weights, IMAGE_SIZE, CHANNELS_IMG, Z_DIM, FEATURES_GEN, FEATURES_DISC
import os
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from PIL import Image
from tqdm import tqdm
import csv

# Hyperparameters etc.
LEARNING_RATE = 2e-4  # From DCGAN paper
BATCH_SIZE = 128
NUM_EPOCHS = 50 # Adjusted for A100 full dataset training
BETA1 = 0.5 # From DCGAN paper
DATASET_ROOT = "dataset/"

class CelebADataset(torch.utils.data.Dataset):
    def __init__(self, root_dir, csv_file, transform=None, limit=5000):
        self.root_dir = root_dir
        self.transform = transform
        
        # Load CSV and limit to `limit` rows if provided
        df = pd.read_csv(csv_file)
        if limit is not None:
            df = df.head(limit)
        self.image_names = df['image_id'].values

    def __len__(self):
        return len(self.image_names)

    def __getitem__(self, idx):
        # ImageFolder uses nested class directories, since CelebA puts all in img_align_celeba:
        img_path = os.path.join(self.root_dir, 'img_align_celeba', self.image_names[idx])
        image = Image.open(img_path).convert("RGB")
        
        if self.transform:
            image = self.transform(image)
            
        return image

def train():
    try:
        import torch_directml
        if torch_directml.is_available():
            device = torch_directml.device()
            print("Using Intel Arc GPU via DirectML!")
        else:
            device = torch.device("cpu")
            print("DirectML not available, using CPU.")
    except ImportError:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {device}")

    # Transforms for CelebA
    transform = transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize([0.5 for _ in range(CHANNELS_IMG)], [0.5 for _ in range(CHANNELS_IMG)]),
    ])

    print("Loading Images & Labels from CSV...")
    # Initialize our custom Dataset (limit=None to use entire dataset)
    dataset = CelebADataset(
        root_dir="dataset/celeba/", 
        csv_file="dataset/celeba/list_attr_celeba.csv", 
        transform=transform, 
        limit=None
    )

    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    gen = Generator(Z_DIM, CHANNELS_IMG, FEATURES_GEN).to(device)
    disc = Discriminator(CHANNELS_IMG, FEATURES_DISC).to(device)

    initialize_weights(gen)
    initialize_weights(disc)

    opt_gen = optim.Adam(gen.parameters(), lr=LEARNING_RATE, betas=(BETA1, 0.999))
    opt_disc = optim.Adam(disc.parameters(), lr=LEARNING_RATE, betas=(BETA1, 0.999))
    criterion = nn.BCEWithLogitsLoss()

    # Fixed noise for evaluating generator progression
    fixed_noise = torch.randn(32, Z_DIM, 1, 1).to(device)
    
    os.makedirs("outputs", exist_ok=True)
    
    loss_log_path = "loss_log.csv"
    with open(loss_log_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['epoch', 'loss_d', 'loss_g'])
    
    gen.train()
    disc.train()

    print("Starting Training Loop...")
    for epoch in range(NUM_EPOCHS):
        epoch_loss_d = 0.0
        epoch_loss_g = 0.0
        num_batches = len(dataloader)
        
        loop = tqdm(dataloader, leave=True)
        for batch_idx, real in enumerate(loop):
            current_batch_size = real.shape[0]
            real = real.to(device)
            
            noise = torch.randn(current_batch_size, Z_DIM, 1, 1).to(device)
            fake = gen(noise)

            ### Train Discriminator
            disc_real = disc(real).reshape(-1)
            loss_disc_real = criterion(disc_real, torch.ones_like(disc_real))
            
            disc_fake = disc(fake.detach()).reshape(-1)
            loss_disc_fake = criterion(disc_fake, torch.zeros_like(disc_fake))
            
            loss_disc = (loss_disc_real + loss_disc_fake) / 2
            
            disc.zero_grad()
            loss_disc.backward()
            opt_disc.step()

            ### Train Generator
            output = disc(fake).reshape(-1)
            loss_gen = criterion(output, torch.ones_like(output))
            
            gen.zero_grad()
            loss_gen.backward()
            opt_gen.step()
            
            # Print losses occasionally and print to tensorboard
            loop.set_postfix(
                epoch=epoch,
                loss_d=loss_disc.item(),
                loss_g=loss_gen.item()
            )
            
            epoch_loss_d += loss_disc.item()
            epoch_loss_g += loss_gen.item()
            
        # Save sample images per epoch
        with torch.no_grad():
            fake = gen(fixed_noise)
            img_grid = torchvision.utils.make_grid(fake[:32], normalize=True)
            plt.imshow(np.transpose(img_grid.cpu().numpy(), (1, 2, 0)))
            plt.axis("off")
            plt.savefig(f"outputs/epoch_{epoch}.png")
            plt.close()
            
        # Log average epoch loss
        avg_loss_d = epoch_loss_d / num_batches
        avg_loss_g = epoch_loss_g / num_batches
        with open(loss_log_path, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([epoch, avg_loss_d, avg_loss_g])

    print("Training Finished. Saving model...")
    # Navigate up one directory folder as backend will look in root level
    torch.save(gen.state_dict(), "../generator.pth")
    print("Saved as ../generator.pth")

if __name__ == "__main__":
    train()
