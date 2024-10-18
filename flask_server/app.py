# flask_server/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import json
from pdf_processor import split_pdf_and_save
from model_create import process_toxicity

app = Flask(__name__)

# CORS 설정: 필요에 따라 특정 도메인만 허용하도록 수정 가능
CORS(app, resources={
    r"/process-pdf": {"origins": "https://your-vercel-app.vercel.app"},
    r"/process-toxicity": {"origins": "https://your-vercel-app.vercel.app"}
})

# 최대 파일 크기 설정 (예: 20MB)
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # 20 MB

# API 키 설정 (환경 변수로 관리 권장)
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
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Invalid file type. Only PDF files are allowed.'}), 400

        # 임시 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            input_pdf_path = os.path.join(temp_dir, file.filename)
            output_pdf_dir = os.path.join(temp_dir, 'split_pdfs')
            output_txt_dir = os.path.join(temp_dir, 'split_txts')
            os.makedirs(output_pdf_dir, exist_ok=True)
            os.makedirs(output_txt_dir, exist_ok=True)

            # 업로드된 PDF 저장
            file.save(input_pdf_path)

            # PDF 처리
            pdf_result = split_pdf_and_save(input_pdf_path, output_pdf_dir, output_txt_dir)
            if "completed successfully" not in pdf_result:
                return jsonify({'error': pdf_result}), 500

            # 처리된 파일 목록 가져오기
            processed_pdfs = os.listdir(output_pdf_dir)
            processed_txts = os.listdir(output_txt_dir)

            return jsonify({
                'message': pdf_result,
                'processed_pdfs': processed_pdfs,
                'processed_txts': processed_txts
            }), 200

    except Exception as e:
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
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # 디버그 모드 비활성화 (배포 시)
    app.run(host='0.0.0.0', port=5000)
