import os
from PIL import Image

def stitch_images_vertically(directory):
    # Get all PNG files in the directory
    image_files = [f for f in os.listdir(directory) if f.endswith('.png') and f != '.DS_Store']
    image_files.sort()  # Sort the files to ensure consistent order

    # Open all images
    images = [Image.open(os.path.join(directory, f)) for f in image_files]

    # Get dimensions of the first image
    width, height = images[0].size

    # Create a new image with height of all images combined
    total_height = sum(img.size[1] for img in images)
    stitched_image = Image.new('RGB', (width, total_height))

    # Paste images one below another
    y_offset = 0
    for img in images:
        stitched_image.paste(img, (0, y_offset))
        y_offset += img.size[1]

    # Save the stitched image
    stitched_image.save('stitched_output.png')
    print("Images stitched successfully. Output saved as 'stitched_output.png'")

if __name__ == "__main__":
    stitch_images_vertically('.')  # Use current directory
