import os
import pdfplumber
import tempfile
import requests
import logging
from flask import Flask, request, jsonify

app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.INFO, format='--Log: %(message)s')

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

if __name__ == "__main__":
    app.run(debug=True)
