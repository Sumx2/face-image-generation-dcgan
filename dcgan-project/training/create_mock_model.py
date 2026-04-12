import torch
import os
from model import Generator, Z_DIM, CHANNELS_IMG, FEATURES_GEN

def create_mock():
    """ Creates an untrained generator weights file to test Backend/Frontend instantly."""
    print("Creating an untrained mock generator...")
    gen = Generator(Z_DIM, CHANNELS_IMG, FEATURES_GEN)
    # Save directly to the parent folder so backend can use it
    torch.save(gen.state_dict(), "../generator.pth")
    print("Saved untranied generator.pth to parent dir.")

if __name__ == "__main__":
    create_mock()
