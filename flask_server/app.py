# flask_server/app.py

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
from pdf_processor import split_pdf_and_save
from model_create import process_toxicity

# 환경 변수 로드
load_dotenv()

app = Flask(__name__)

# 필요한 디렉토리 목록
required_directories = ['uploads', 'split_pdfs', 'split_txts']

# 디렉토리가 존재하지 않으면 생성
for directory in required_directories:
    dir_path = os.path.join(os.path.dirname(__file__), directory)
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
        print(f"[INFO] 디렉토리 생성: {dir_path}")
    else:
        print(f"[INFO] 디렉토리 이미 존재: {dir_path}")

# CORS 설정: 여러 도메인 허용
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')

CORS(app, resources={
    r"/process-pdf": {"origins": CORS_ALLOWED_ORIGINS},
    r"/process-toxicity": {"origins": CORS_ALLOWED_ORIGINS},
    r"/download-txt/<filename>": {"origins": CORS_ALLOWED_ORIGINS},
    r"/download-pdf/<filename>": {"origins": CORS_ALLOWED_ORIGINS},  # 추가된 부분
})

# 최대 파일 크기 설정 (예: 20MB)
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # 20 MB

# API 키 설정
API_KEY = os.getenv('API_KEY', 'your_default_api_key')

def require_api_key(func):
    def wrapper(*args, **kwargs):
        key = request.headers.get('x-api-key')
        if key and key == API_KEY:
            return func(*args, **kwargs)
        else:
            return jsonify({'error': 'Unauthorized'}), 401
    wrapper.__name__ = func.__name__
    return wrapper

@app.route('/process-pdf', methods=['POST'])
@require_api_key
def process_pdf_endpoint():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part in the request'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Invalid file type. Only PDF files are allowed.'}), 400

        # 업로드된 PDF 저장
        uploads_dir = os.path.join(os.path.dirname(__file__), 'uploads')
        input_pdf_path = os.path.join(uploads_dir, file.filename)
        file.save(input_pdf_path)
        print(f"[INFO] 업로드된 PDF 저장: {input_pdf_path}")

        # PDF 처리
        split_pdfs_dir = os.path.join(os.path.dirname(__file__), 'split_pdfs')
        split_txts_dir = os.path.join(os.path.dirname(__file__), 'split_txts')

        pdf_result, processed_pdfs, processed_txts, extracted_texts = split_pdf_and_save(input_pdf_path, split_pdfs_dir, split_txts_dir)
        if "completed successfully" not in pdf_result:
            return jsonify({'error': pdf_result}), 500

        # 텍스트 파일 다운로드 URL 생성
        txt_download_urls = {filename: f"/download-txt/{filename}" for filename in processed_txts}

        # PDF 파일 다운로드 URL 생성
        pdf_download_urls = {filename: f"/download-pdf/{filename}" for filename in processed_pdfs}

        return jsonify({
            'message': pdf_result,
            'processed_pdfs': processed_pdfs,
            'processed_txts': processed_txts,
            'extracted_texts': extracted_texts,
            'pdf_download_urls': pdf_download_urls,  # 추가된 부분
            'txt_download_urls': txt_download_urls
        }), 200

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/process-toxicity', methods=['GET'])
@require_api_key
def process_toxicity_endpoint():
    try:
        # 엑셀 파일 경로 (app.py와 동일한 디렉토리에 위치)
        excel_file_path = os.path.join(os.path.dirname(__file__), 'weights.xlsx')

        if not os.path.exists(excel_file_path):
            return jsonify({'error': 'Excel file not found'}), 404

        # 독성 처리 함수 호출
        toxicity_result = process_toxicity(excel_file_path)

        return jsonify({'result': json.loads(toxicity_result)}), 200

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/download-txt/<filename>', methods=['GET'])
@require_api_key
def download_txt(filename):
    try:
        # split_txts 디렉토리 경로
        split_txts_dir = os.path.join(os.path.dirname(__file__), 'split_txts')

        return send_from_directory(directory=split_txts_dir, path=filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({'error': f"File not found: {filename}"}), 404
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/download-pdf/<filename>', methods=['GET'])  # 추가된 부분
@require_api_key
def download_pdf(filename):
    try:
        # split_pdfs 디렉토리 경로
        split_pdfs_dir = os.path.join(os.path.dirname(__file__), 'split_pdfs')

        return send_from_directory(directory=split_pdfs_dir, path=filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({'error': f"File not found: {filename}"}), 404
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # 디버그 모드 비활성화 (배포 시)
    app.run(host='0.0.0.0', port=5000)
