import base64
from io import BytesIO
import torch
import torchvision.transforms as transforms
import os
import random

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

def get_random_real_images(dataset_dir, count=4):
    """
    Fetches random real images from the dataset directory,
    crops and resizes them to match the generator output (64x64),
    and returns them as Base64 strings.
    """
    try:
        if not os.path.exists(dataset_dir):
            return []
            
        all_files = os.listdir(dataset_dir)
        image_files = [f for f in all_files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if not image_files:
            return []
            
        selected_files = random.sample(image_files, min(count, len(image_files)))
        
        # Apply the exact same transforms as training so it's a fair comparison
        transform = transforms.Compose([
            transforms.Resize(64),
            transforms.CenterCrop(64),
        ])
        
        from PIL import Image
        base64_images = []
        for file in selected_files:
            file_path = os.path.join(dataset_dir, file)
            pil_img = Image.open(file_path).convert("RGB")
            
            # Crop to exactly match DCGAN training view
            cropped_img = transform(pil_img)
            
            # Save to buffer
            buffered = BytesIO()
            cropped_img.save(buffered, format="JPEG")
            
            # Encode as Base64
            encoded_string = base64.b64encode(buffered.getvalue()).decode("utf-8")
            base64_images.append(f"data:image/jpeg;base64,{encoded_string}")
                
        return base64_images
    except Exception as e:
        print(f"Error fetching real images: {e}")
        return []
