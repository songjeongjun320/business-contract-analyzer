from PyPDF2 import PdfReader, PdfWriter
import os

def split_pdf(input_pdf_path, output_dir):
    print(f"Splitting PDF: {input_pdf_path}")
    print(f"Output Directory: {output_dir}")

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Use PdfReader instead of PdfFileReader
    with open(input_pdf_path, 'rb') as pdf_file:
        reader = PdfReader(pdf_file)
        num_pages = len(reader.pages)

        print(f"Total Pages: {num_pages}")

        output_files = []

        # Loop over each page and create a new PDF
        for i in range(num_pages):
            writer = PdfWriter()
            writer.add_page(reader.pages[i])

            output_pdf_path = os.path.join(output_dir, f"page_{i + 1}.pdf")
            print(f"Writing: {output_pdf_path}")
            with open(output_pdf_path, 'wb') as output_pdf:
                writer.write(output_pdf)

            output_files.append(output_pdf_path)
    
    return output_files

# Main function to execute the script standalone
if __name__ == "__main__":
    # Replace these paths with your own test paths
    input_pdf_path = "C:/Users/frank/Desktop/catching_hidden_claues/06-27625-00_Blind_Ideas_MSA (1)_WE O'Neil  Boiler Plate copy.pdf"  # Default pdf position
    output_dir = "C:/Users/frank/Desktop/catching_hidden_claues/app/db/split_pdf_here"  # Save here

    # Run the split function
    try:
        split_pdf(input_pdf_path, output_dir)
        print("PDF splitting completed successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
