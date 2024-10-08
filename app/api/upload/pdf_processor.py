import re
from PyPDF2 import PdfReader, PdfWriter
import os

def clean_contract_text(text):
    # 1. 페이지 번호와 버전 정보 제거
    text = re.sub(r'Page\s?\d+of\s?\S+|\bRev\.\s?\S+', '', text)

    # 2. 단일 문자 또는 번호로 끝나는 라인 제거 (예: A. B. 1. 2. 등)
    text = re.sub(r'^\s*[A-Z]\.\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s*$', '', text, flags=re.MULTILINE)
    
    # 3. 전화번호 및 팩스번호 제거 (형식: xxx-xxx-xxxx 또는 xxx xxx xxxx)
    text = re.sub(r'\d{3}[-\.\s]?\d{3}[-\.\s]?\d{4}', '', text)
    
    # 4. 공백 정리 및 불필요한 줄바꿈 제거
    text = re.sub(r'\s+', ' ', text).strip()  # 중복된 공백 제거
    text = re.sub(r'\s*\n\s*', '\n', text)  # 중복된 줄바꿈 제거

    return text

def insert_line_breaks(text):
    # 문장이 끝나는 곳에 줄바꿈을 추가 (마침표, 느낌표, 물음표)
    text_with_breaks = re.sub(r'([.!?])\s+', r'\1\n', text)
    return text_with_breaks

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

        # 페이지 수 확인
        print(f"Total Pages in PDF: {num_pages}")

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

            # Extract text from the page and clean it
            page_text = page.extract_text()
            if page_text:  # If there's text on the page
                cleaned_text = clean_contract_text(page_text)  # 텍스트 클리닝
                final_text = insert_line_breaks(cleaned_text)  # 줄바꿈 추가
                output_txt_path = os.path.join(output_txt_dir, f"{i + 1}.txt")
                print(f"Writing cleaned and formatted TXT: {output_txt_path}")
                with open(output_txt_path, 'w', encoding='utf-8') as output_txt_file:
                    output_txt_file.write(final_text)
            else:
                print(f"Page {i + 1} has no text or text could not be extracted.")
    
    print("PDF splitting and text extraction completed successfully.")

# Main function to execute the script standalone
if __name__ == "__main__":
    # Replace these paths with your own test paths
    input_pdf_path = "C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/pure_contract.pdf"  # Default pdf position
    output_pdf_dir = "C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/app/db/split_pdf_here"  # PDF save path
    output_txt_dir = "C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/app/db/split_txt_here"  # TXT save path

    # Run the split and text extraction function
    try:
        split_pdf_and_save(input_pdf_path, output_pdf_dir, output_txt_dir)
        print("PDF and text extraction completed successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
