import zipfile
import os

print("Starting extraction... This may take a couple minutes due to 200,000 images.")
os.makedirs("dataset/celeba", exist_ok=True)
try:
    with zipfile.ZipFile("img_align_celeba.zip", 'r') as zip_ref:
        zip_ref.extractall("dataset/celeba")
    print("Done! Extracted into dataset/celeba/")
except Exception as e:
    print("Error:", e)
