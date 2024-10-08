from PyPDF2 import PdfReader, PdfWriter
import os

def split_pdf_and_save(input_pdf_path, output_pdf_dir, output_txt_dir):
    print(f"Splitting PDF: {input_pdf_path}")
    print(f"Output PDF Directory: {output_pdf_dir}")
    print(f"Output TXT Directory: {output_txt_dir}")

    # Create the output directories if they don't exist
    if not os.path.exists(output_pdf_dir):
        os.makedirs(output_pdf_dir)
    if not os.path.exists(output_txt_dir):
        os.makedirs(output_txt_dir)
    
    # Open the PDF file
    with open(input_pdf_path, 'rb') as pdf_file:
        reader = PdfReader(pdf_file)
        num_pages = len(reader.pages)

        print(f"Total Pages: {num_pages}")

        # Loop over each page, save each as a new PDF and extract text
        for i in range(num_pages):
            writer = PdfWriter()
            page = reader.pages[i]
            writer.add_page(page)

            # Save the PDF file for each page
            output_pdf_path = os.path.join(output_pdf_dir, f"page_{i + 1}.pdf")
            print(f"Writing PDF: {output_pdf_path}")
            with open(output_pdf_path, 'wb') as output_pdf_file:
                writer.write(output_pdf_file)

            # Extract text from the page and save as .txt
            page_text = page.extract_text()
            if page_text:  # If there's text on the page
                output_txt_path = os.path.join(output_txt_dir, f"{i + 1}.txt")
                print(f"Writing TXT: {output_txt_path}")
                with open(output_txt_path, 'w', encoding='utf-8') as output_txt_file:
                    output_txt_file.write(page_text)
            else:
                print(f"Page {i + 1} has no text.")
    
    print("PDF splitting and text extraction completed successfully.")

# Main function to execute the script standalone
if __name__ == "__main__":
    # Replace these paths with your own test paths
    input_pdf_path = "C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/06-27625-00_Blind_Ideas_MSA (1)_WE O'Neil  Boiler Plate.pdf"  # Default pdf position
    output_pdf_dir = "C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/app/db/split_pdf_here"  # PDF save path
    output_txt_dir = "C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/app/db/split_txt_here"  # TXT save path

    # Run the split and text extraction function
    try:
        split_pdf_and_save(input_pdf_path, output_pdf_dir, output_txt_dir)
        print("PDF and text extraction completed successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
