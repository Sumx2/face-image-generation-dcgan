import base64
from io import BytesIO
import torch
import torchvision.transforms as transforms

def tensor_to_base64_images(tensor):
    """
    Takes a generated image tensor (N x C x H x W) normalized between [-1, 1],
    unnormalizes it to [0, 1], converts to PIL Images, and encodes to Base64 strings.
    Returns: List of base64 encoded strings
    """
    # Unnormalize: [-1, 1] -> [0, 1]
    tensor = (tensor + 1) / 2.0
    # Ensure values are within [0, 1] boundaries
    tensor = torch.clamp(tensor, 0, 1)

    # Convert to PIL Image
    to_pil = transforms.ToPILImage()
    
    base64_images = []
    # Process batch dimension
    for i in range(tensor.size(0)):
        pil_img = to_pil(tensor[i])
        
        # Save to buffer
        buffered = BytesIO()
        pil_img.save(buffered, format="JPEG")
        
        # Encode as Base64
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        base64_images.append(f"data:image/jpeg;base64,{img_str}")

    return base64_images
