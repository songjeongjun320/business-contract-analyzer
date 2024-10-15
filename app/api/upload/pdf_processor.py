from PyPDF2 import PdfReader, PdfWriter
from pdfminer.high_level import extract_text
import os
import sys

def split_pdf_and_save(input_pdf_path, output_pdf_dir, output_txt_dir):
    print(f"Splitting PDF: {input_pdf_path}")
    print(f"Output PDF Directory: {output_pdf_dir}")
    print(f"Output TXT Directory: {output_txt_dir}")

    # Create the output directories if they don't exist
    os.makedirs(output_pdf_dir, exist_ok=True)
    os.makedirs(output_txt_dir, exist_ok=True)

    # Open the PDF file
    with open(input_pdf_path, 'rb') as pdf_file:
        reader = PdfReader(pdf_file)
        num_pages = len(reader.pages)

        # Check the number of pages
        print(f"Total Pages in PDF: {num_pages}")

        # Loop over each page, save each as a new PDF and extract text
        for i in range(num_pages):
            writer = PdfWriter()
            page = reader.pages[i]
            writer.add_page(page)

            # Format the page number to have leading zeros (e.g., 01, 02, 03, ...)
            page_num = str(i + 1).zfill(2)

            # Save the PDF file for each page
            output_pdf_path = os.path.join(output_pdf_dir, f"page_{page_num}.pdf")
            print(f"Writing PDF: {output_pdf_path}")
            with open(output_pdf_path, 'wb') as output_pdf_file:
                writer.write(output_pdf_file)

            # Extract text from the original PDF file for the current page
            page_text = extract_text(input_pdf_path, page_numbers=[i])
            if page_text:  # If there's text on the page
                # Save the cleaned text with '_clean' in the file name
                output_txt_path = os.path.join(output_txt_dir, f"{page_num}_clean.txt")
                print(f"Writing cleaned and formatted TXT: {output_txt_path}")
                with open(output_txt_path, 'w', encoding='utf-8') as output_txt_file:
                    output_txt_file.write(page_text)
            else:
                print(f"Page {i + 1} has no text or text could not be extracted.")

    print("PDF splitting and text extraction completed successfully.")

# Main function to execute the script standalone or via command line
if __name__ == "__main__":
    # Check if arguments are passed via the command line
    if len(sys.argv) != 4:
        print("Usage: python pdf_processor.py <input_pdf_path> <output_pdf_dir> <output_txt_dir>")
        sys.exit(1)

    # Use command-line arguments for the file paths
    input_pdf_path = sys.argv[1]
    output_pdf_dir = sys.argv[2]
    output_txt_dir = sys.argv[3]

    # Run the PDF splitting and text extraction process
    try:
        split_pdf_and_save(input_pdf_path, output_pdf_dir, output_txt_dir)
        print("PDF and text extraction completed successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)
