from flask import Flask, jsonify, request
from model_create import process_toxicity  # Assuming this processes toxicity levels from Excel
from flask_cors import CORS
import os
import subprocess

app = Flask(__name__)
CORS(app)  # Allow CORS for all domains

# Path configurations
UPLOAD_FOLDER = 'uploads'
SPLIT_PDF_FOLDER = 'app/db/split_pdf_here'
SPLIT_TXT_FOLDER = 'app/db/split_txt_here'
EXCEL_FILE_PATH = 'C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/weights.xlsx'

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(SPLIT_PDF_FOLDER, exist_ok=True)
os.makedirs(SPLIT_TXT_FOLDER, exist_ok=True)

# Endpoint to process PDF
@app.route("/process-pdf", methods=["POST"])
def process_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Save the uploaded PDF file
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)
    
    # Run pdf_processor.py to split the PDF and extract text
    try:
        command = [
            'python', 'C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/app/api/upload/pdf_processor.py',
            file_path, SPLIT_PDF_FOLDER, SPLIT_TXT_FOLDER
        ]
        subprocess.run(command, check=True)
        return jsonify({"message": "PDF processed successfully"}), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Failed to process PDF: {e}"}), 500

# Endpoint to process toxicity levels from the Excel file
@app.route("/process-toxicity", methods=["GET"])
def get_toxicity():
    try:
        # Use the process_toxicity function from model_create.py
        result = process_toxicity(EXCEL_FILE_PATH)
        return jsonify(result)  # Return the result as JSON
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)  # Run Flask app on port 5000
