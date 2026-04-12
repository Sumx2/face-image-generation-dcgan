import torch
import torch.nn as nn

# Model Architecture mirroring the training setup
IMAGE_SIZE = 64
CHANNELS_IMG = 3
Z_DIM = 100
FEATURES_GEN = 64

class Generator(nn.Module):
    def __init__(self, z_dim, channels_img, features_gen):
        super(Generator, self).__init__()
        self.gen = nn.Sequential(
            # Input: N x z_dim x 1 x 1
            self._block(z_dim, features_gen * 16, 4, 1, 0),
            self._block(features_gen * 16, features_gen * 8, 4, 2, 1),
            self._block(features_gen * 8, features_gen * 4, 4, 2, 1),
            self._block(features_gen * 4, features_gen * 2, 4, 2, 1),
            nn.ConvTranspose2d(
                features_gen * 2, channels_img, kernel_size=4, stride=2, padding=1, bias=False
            ),
            # Output: N x channels_img x 64 x 64
            nn.Tanh()
        )

    def _block(self, in_channels, out_channels, kernel_size, stride, padding):
        return nn.Sequential(
            nn.ConvTranspose2d(in_channels, out_channels, kernel_size, stride, padding, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, x):
        return self.gen(x)
