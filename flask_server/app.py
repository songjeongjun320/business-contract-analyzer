import os
import pdfplumber
import tempfile
import requests
import logging
import pandas as pd
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

# CORS 설정 추가
CORS(app)

# Set up logging
logging.basicConfig(level=logging.INFO, format='--Log: %(message)s')


# 기존의 process_toxicity 함수 추가
def process_toxicity(file_path):
    """
    주어진 엑셀 파일을 읽고, 독성 수준을 계산하여 분류한 후,
    결과를 JSON 형식으로 반환합니다.
    """
    try:
        # 엑셀 파일 읽기
        df = pd.read_excel(file_path)

        # 'Financial Impact'와 'Probability of happening'을 곱해서 새로운 'Calculated Toxicity' 열 추가
        df['Calculated Toxicity'] = df['Financial Impact'] * df['Probability of happening']

        # 독성 수준을 분류하는 함수
        def categorize_toxicity(toxicity):
            if toxicity <= 25:
                return 'low'
            elif 26 <= toxicity <= 75:
                return 'medium'
            else:
                return 'high'

        # 분류 함수 적용해서 'Toxicity Level' 열 추가
        df['Toxicity Level'] = df['Calculated Toxicity'].apply(categorize_toxicity)

        # 전체 항목 리스트
        all_items_list = df['Contractual Terms'].tolist()

        # 'high', 'medium', 'low'로 그룹화된 리스트 생성
        high_list = df[df['Toxicity Level'] == 'high']['Contractual Terms'].tolist()
        medium_list = df[df['Toxicity Level'] == 'medium']['Contractual Terms'].tolist()
        low_list = df[df['Toxicity Level'] == 'low']['Contractual Terms'].tolist()

        result = {
            'all_items': all_items_list,
            'high_toxicity_items': high_list,
            'medium_toxicity_items': medium_list,
            'low_toxicity_items': low_list
        }

        # JSON 형식으로 결과를 반환
        return json.dumps(result)

    except FileNotFoundError:
        return json.dumps({'error': f"File not found: {file_path}"})
    except pd.errors.EmptyDataError:
        return json.dumps({'error': "Excel file is empty"})
    except KeyError as e:
        return json.dumps({'error': f"Missing expected column: {e}"})
    except Exception as e:
        return json.dumps({'error': f"An unexpected error occurred: {str(e)}"})
    

@app.route('/')
def home():
    logging.info("Home route accessed")
    return "Welcome to the Business Contract Analyzer!"

@app.route('/process', methods=['POST'])  # Allow only POST method
def process():
    logging.info("Processing file upload")

    if 'file' not in request.files:
        logging.error("No file part in request")
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']

    if file.filename == '':
        logging.error("No file selected")
        return jsonify({"error": "No selected file"}), 400

    if file and file.filename.endswith('.pdf'):
        logging.info(f"Received PDF file: {file.filename}")

        # 운영 체제에 맞는 임시 디렉토리 사용
        temp_dir = tempfile.gettempdir()
        logging.info(f"Temporary directory is: {temp_dir}")

        # Save the PDF file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf', dir=temp_dir) as temp_file:
            file_path = temp_file.name
            file.save(file_path)
        logging.info(f"Temporary PDF file saved at: {file_path}")

        # Split the PDF into text files, one per page
        txt_files = []
        try:
            with pdfplumber.open(file_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    txt_file_path = os.path.join(temp_dir, f"{i + 1}.txt")
                    with open(txt_file_path, 'w') as txt_file:
                        txt_file.write(text or "")
                    txt_files.append(txt_file_path)
                    logging.info(f"Created text file for page {i + 1}: {txt_file_path}")

            # Send text files to frontend server
            frontend_url = "http://localhost:3000/api/upload"
            files = {f"file_{i + 1}": open(txt_file, 'rb') for i, txt_file in enumerate(txt_files)}

            try:
                logging.info(f"Sending text files to frontend at {frontend_url}")
                response = requests.post(frontend_url, files=files)

                if response.status_code == 200:
                    logging.info("Files sent successfully to frontend")
                    return jsonify({"message": "Files sent successfully to frontend"}), 200
                else:
                    logging.error(f"Failed to send files, status code: {response.status_code}")
                    return jsonify({"error": f"Failed to send files, status code: {response.status_code}"}), 500

            finally:
                # Close files after sending to frontend
                for f in files.values():
                    f.close()

        finally:
            # Remove all temporary files
            logging.info(f"Removing temporary files")
            os.remove(file_path)
            for txt_file in txt_files:
                try:
                    os.remove(txt_file)
                    logging.info(f"Deleted {txt_file}")
                except Exception as e:
                    logging.error(f"Failed to delete {txt_file}: {e}")

    else:
        logging.error("Invalid file type")
        return jsonify({"error": "Invalid file type"}), 400
    

@app.route('/model_weight', methods=['POST'])
def model_weight():
    logging.info("Processing Excel file upload for toxicity model")

    if 'file' not in request.files:
        logging.error("No file part in request")
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']

    if file.filename == '':
        logging.error("No file selected")
        return jsonify({"error": "No selected file"}), 400

    if file and (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        logging.info(f"Received Excel file: {file.filename}")

        # 운영 체제에 맞는 임시 디렉토리 사용
        temp_dir = tempfile.gettempdir()
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx', dir=temp_dir) as temp_file:
            file_path = temp_file.name
            file.save(file_path)
        logging.info(f"Temporary Excel file saved at: {file_path}")

        try:
            # Excel 파일 처리
            result_json = process_toxicity(file_path)
            logging.info("Excel file processed successfully")

            # 결과를 JSON 형태로 반환
            return jsonify(json.loads(result_json)), 200

        except Exception as e:
            logging.error(f"Error processing Excel file: {e}")
            return jsonify({"error": f"Failed to process file: {str(e)}"}), 500

        finally:
            # 임시 파일 삭제
            os.remove(file_path)
            logging.info(f"Deleted temporary file: {file_path}")

    else:
        logging.error("Invalid file type")
        return jsonify({"error": "Invalid file type. Please upload an Excel file."}), 400


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)