# flask_server/pdf_processor.py

from PyPDF2 import PdfReader, PdfWriter
from pdfminer.high_level import extract_text
import os

def split_pdf_and_save(input_pdf_path, output_pdf_dir, output_txt_dir):
    """
    주어진 PDF 파일을 페이지별로 분할하고, 각 페이지의 텍스트를 추출하여 저장합니다.

    Parameters:
        input_pdf_path (str): 처리할 입력 PDF 파일의 경로.
        output_pdf_dir (str): 분할된 PDF 파일들을 저장할 디렉토리 경로.
        output_txt_dir (str): 추출된 텍스트 파일들을 저장할 디렉토리 경로.

    Returns:
        str: 처리 완료 메시지 또는 에러 메시지.
    """
    try:
        print(f"[INFO] PDF 처리 시작: {input_pdf_path}")

        # PDF 파일 열기
        with open(input_pdf_path, 'rb') as pdf_file:
            print("[INFO] PDF 파일 열기 성공.")
            reader = PdfReader(pdf_file)
            num_pages = len(reader.pages)
            print(f"[INFO] 총 페이지 수: {num_pages}")

            # 각 페이지별로 처리
            for i in range(num_pages):
                print(f"[INFO] 페이지 {i + 1} 처리 시작.")
                writer = PdfWriter()
                page = reader.pages[i]
                writer.add_page(page)

                # 페이지 번호를 두 자리로 포맷 (예: 01, 02, ...)
                page_num = str(i + 1).zfill(2)
                pdf_filename = f"page_{page_num}.pdf"
                pdf_output_path = os.path.join(output_pdf_dir, pdf_filename)

                # 분할된 PDF 저장
                with open(pdf_output_path, 'wb') as output_pdf_file:
                    writer.write(output_pdf_file)
                print(f"[INFO] 분할된 PDF 저장: {pdf_output_path}")

                # 텍스트 추출
                print(f"[INFO] 페이지 {i + 1}의 텍스트 추출 시작.")
                page_text = extract_text(input_pdf_path, page_numbers=[i])

                if page_text:
                    txt_filename = f"{page_num}_clean.txt"
                    txt_output_path = os.path.join(output_txt_dir, txt_filename)
                    with open(txt_output_path, 'w', encoding='utf-8') as output_txt_file:
                        output_txt_file.write(page_text)
                    print(f"[INFO] 추출된 텍스트 저장: {txt_output_path}")
                else:
                    print(f"[WARNING] 페이지 {i + 1}에서 텍스트를 추출할 수 없습니다.")

        print("[INFO] PDF 분할 및 텍스트 추출 완료.")
        return "PDF splitting and text extraction completed successfully."

    except FileNotFoundError:
        error_message = f"[ERROR] 파일을 찾을 수 없습니다: {input_pdf_path}"
        print(error_message)
        return error_message
    except PermissionError:
        error_message = f"[ERROR] 파일에 접근할 수 없습니다: {input_pdf_path}"
        print(error_message)
        return error_message
    except Exception as e:
        error_message = f"[ERROR] 예상치 못한 오류 발생: {str(e)}"
        print(error_message)
        return error_message
