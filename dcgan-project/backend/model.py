import torch
import torch.nn as nn

# Spatial size of training images. All images will be resized to this size.
IMAGE_SIZE = 64
# Number of channels in the training images. For color images this is 3.
CHANNELS_IMG = 3
# Size of z latent vector (i.e. size of generator input)
Z_DIM = 100
# Number of feature maps in generator
FEATURES_GEN = 64
# Number of feature maps in discriminator
FEATURES_DISC = 64

NUM_CLASSES = 3 # Male, Smiling, Eyeglasses

class Discriminator(nn.Module):
    def __init__(self, channels_img, features_d, num_classes=NUM_CLASSES):
        super(Discriminator, self).__init__()
        self.disc = nn.Sequential(
            # Input: N x (channels_img + num_classes) x 64 x 64
            nn.Conv2d(channels_img + num_classes, features_d, kernel_size=4, stride=2, padding=1, bias=False),
            nn.LeakyReLU(0.2, inplace=True),
            # Input: N x features_d x 32 x 32
            self._block(features_d, features_d * 2, 4, 2, 1),
            # Input: N x features_d*2 x 16 x 16
            self._block(features_d * 2, features_d * 4, 4, 2, 1),
            # Input: N x features_d*4 x 8 x 8
            self._block(features_d * 4, features_d * 8, 4, 2, 1),
            # Input: N x features_d*8 x 4 x 4
            nn.Conv2d(features_d * 8, 1, kernel_size=4, stride=1, padding=0, bias=False),
            # Output: N x 1 x 1 x 1
        )

    def _block(self, in_channels, out_channels, kernel_size, stride, padding):
        return nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size, stride, padding, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.LeakyReLU(0.2, inplace=True)
        )

    def forward(self, x, labels):
        # labels: N x num_classes
        labels = labels.view(labels.size(0), labels.size(1), 1, 1)
        labels = labels.expand(-1, -1, x.size(2), x.size(3))
        x = torch.cat([x, labels], dim=1) # Congregate on channel dim
        return self.disc(x)

class Generator(nn.Module):
    def __init__(self, z_dim, channels_img, features_gen, num_classes=NUM_CLASSES):
        super(Generator, self).__init__()
        self.gen = nn.Sequential(
            # Input: N x (z_dim + num_classes) x 1 x 1
            self._block(z_dim + num_classes, features_gen * 16, 4, 1, 0),  # N x features_gen*16 x 4 x 4
            self._block(features_gen * 16, features_gen * 8, 4, 2, 1), # N x features_gen*8 x 8 x 8
            self._block(features_gen * 8, features_gen * 4, 4, 2, 1),  # N x features_gen*4 x 16 x 16
            self._block(features_gen * 4, features_gen * 2, 4, 2, 1),  # N x features_gen*2 x 32 x 32
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

    def forward(self, x, labels):
        # x: N x z_dim x 1 x 1
        # labels: N x num_classes
        labels = labels.view(labels.size(0), labels.size(1), 1, 1) # N x num_classes x 1 x 1
        x = torch.cat([x, labels], dim=1)
        return self.gen(x)

def initialize_weights(model):
    # Initializes weights according to the DCGAN paper
    for m in model.modules():
        if isinstance(m, (nn.Conv2d, nn.ConvTranspose2d, nn.BatchNorm2d)):
            nn.init.normal_(m.weight.data, 0.0, 0.02)
