import pytesseract
from PIL import Image

def extract_text_from_image(image_path):
    # Open the image file
    with Image.open(image_path) as img:
        # Use pytesseract to extract text
        text = pytesseract.image_to_string(img)
    return text

if __name__ == "__main__":
    image_path = "stitched_output2.png"
    extracted_text = extract_text_from_image(image_path)
    print("Extracted text:")
    print(extracted_text)

    # Optionally, save the extracted text to a file
    with open("extracted_text.txt", "w") as f:
        f.write(extracted_text)
    print("Text has been saved to 'extracted_text.txt'")