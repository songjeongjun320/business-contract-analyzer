import os
import pdfplumber
import shutil
import pandas as pd
import json
import io
import asyncio
import aiohttp
from dotenv import load_dotenv
from flask import Flask, request, jsonify

# 환경 변수 로드
load_dotenv()

# Supabase 설정
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")  # AI API 키
PDF_BUCKET = "pdf-uploads"
RESULT_BUCKET = "txt-results"
RESULT_DIRECTORY = "./flask_server/result"  # 실제 경로로 변경

app = Flask(__name__)

def create_unique_folder(base_path: str) -> str:
    """고유한 폴더 생성."""
    index = 0
    while True:
        folder_name = f"result{index:02d}" if index > 0 else "result"
        folder_path = os.path.join(base_path, folder_name)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            return folder_path
        index += 1

def process_toxicity(file_path: str) -> dict:
    """독성 수준 계산."""
    print(f"[INFO] Processing toxicity for {file_path}")
    try:
        df = pd.read_excel(file_path)
        df['Calculated Toxicity'] = df['Financial Impact'] * df['Probability of happening']

        def categorize_toxicity(toxicity):
            if toxicity <= 25:
                return 'low'
            elif 26 <= toxicity <= 75:
                return 'medium'
            else:
                return 'high'

        df['Toxicity Level'] = df['Calculated Toxicity'].apply(categorize_toxicity)

        result = {
            'all_items': df['Contractual Terms'].tolist(),
            'high_toxicity_items': df[df['Toxicity Level'] == 'high']['Contractual Terms'].tolist(),
            'medium_toxicity_items': df[df['Toxicity Level'] == 'medium']['Contractual Terms'].tolist(),
            'low_toxicity_items': df[df['Toxicity Level'] == 'low']['Contractual Terms'].tolist()
        }

        print(f"[INFO] Toxicity processing completed: {result}")
        return result

    except Exception as e:
        print(f"[ERROR] Failed to process toxicity: {e}")
        return {'error': str(e)}

async def send_groq_request(file_name: str, text: str, base_data: dict):
    """Groq API에 텍스트 파일을 보내고 응답을 처리하는 함수."""
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    messages = [
        {
            "role": "system",
            "content": (
                f"This is a base_data.json file containing keys that represent clauses "
                f"in a business contract: {json.dumps(base_data)}. "
                "Analyze the provided text and categorize the clauses according to these keys. "
                "Follow the rules below:\n"
                "1. Do not create new keys.\n"
                "2. Only use the existing keys from base_data.json.\n"
                "3. Respond with a JSON format that matches the exact structure of base_data.json.\n"
                "4. Extract relevant sentences from the provided text and add them as values in string "
                "format under the appropriate key in base_data.json.\n"
                "5. If the relevant sentence is too long, summarize it to 1 or 2 sentences."
            ),
        },
        {
            "role": "user",
            "content": f"Ensure the response format matches base_data.json. No comments, just .json format\n\n{text}",
        },
    ]

    payload = {"messages": messages, "model": "llama3-70b-8192"}

    async with aiohttp.ClientSession() as session:
        async with session.post("https://api.groq.com/v1/completions", headers=headers, json=payload) as response:
            if response.status == 200:
                result = await response.json()
                return result
            else:
                print(f"[ERROR] Failed to call Groq API for {file_name}, Status: {response.status}")
                return None

async def process_text_files(text_files, base_data):
    """모든 텍스트 파일을 처리하고 Groq API에 보냅니다."""
    tasks = []
    
    for file_name, text in text_files.items():
        tasks.append(send_groq_request(file_name, text, base_data))

    # 비동기 작업을 병렬로 실행
    results = await asyncio.gather(*tasks)
    
    successful_results = []
    errors = []

    for i, result in enumerate(results):
        file_name = list(text_files.keys())[i]
        if result:
            print(f"[INFO] Processing response for {file_name}")
            json_content = result['choices'][0]['message']['content'].strip()

            if "{" in json_content and "}" in json_content:
                start_index = json_content.index("{")
                end_index = json_content.rindex("}")
                json_content = json_content[start_index:end_index + 1]

            try:
                categorized_clauses = json.loads(json_content)
                successful_results.append((file_name, categorized_clauses))
            except json.JSONDecodeError as e:
                print(f"[ERROR] Failed to parse JSON from Groq API for {file_name}: {e}")
                errors.append(file_name)
        else:
            errors.append(file_name)

    return successful_results, errors

async def process_all_files(text_files, base_data):
    """모든 텍스트 파일을 처리하고 결과를 저장합니다."""
    successful_results, errors = await process_text_files(text_files, base_data)

    existing_data = {}
    result_file_path = os.path.join(RESULT_DIRECTORY, "all_results.json")

    # 기존 파일 읽기
    if os.path.exists(result_file_path):
        with open(result_file_path, "r") as file:
            existing_data = json.load(file)

    for file_name, categorized_clauses in successful_results:
        for key, value in categorized_clauses.items():
            if key in existing_data:
                existing_data[key].extend(value)
            else:
                existing_data[key] = value

    with open(result_file_path, "w") as file:
        json.dump(existing_data, file, indent=2)

    print(f"[INFO] Saved updated result to JSON file: {result_file_path}")
    print(f"Successful results count: {len(successful_results)}")
    print(f"Errors count: {len(errors)}")

    if len(successful_results) == 0:
        raise Exception("No files were successfully processed.")

@app.route("/api/process-pdf", methods=["POST"])
def process_pdf():
    """PDF 처리 및 AI API 호출."""
    print("[INFO] PDF processing request received.")
    data = request.json
    pdf_path = data.get("path")

    if not pdf_path:
        print("[ERROR] No PDF path provided.")
        return jsonify({"error": "No PDF path provided"}), 400

    try:
        temp_pdf = pdf_path  # Supabase에서 PDF 다운로드

        print(f"[INFO] Extracting text from the PDF file: {temp_pdf}")
        result_folder = create_unique_folder("/tmp/txt-results")
        txt_files = {}
        with pdfplumber.open(temp_pdf) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                txt_files[f"page_{i + 1}.txt"] = text
                print(f"[INFO] Extracted text from page {i + 1}.")

        weights_file_path = os.path.join(os.path.dirname(__file__), 'weights.xlsx')
        toxicity_data = process_toxicity(weights_file_path)

        base_data = {item: [] for item in toxicity_data['all_items']}

        print("[INFO] Sending text files to Groq API for processing.")
        asyncio.run(process_all_files(txt_files, base_data))

        shutil.rmtree(result_folder)
        print("[INFO] PDF processed successfully.")
        return jsonify({"message": "PDF processed successfully"}), 200

    except Exception as e:
        print(f"[ERROR] An error occurred during PDF processing: {str(e)}")
        return jsonify({"error": str(e)}), 500

def process_pdf_local(pdf_file_path: str):
    """로컬 경로에 있는 PDF 파일을 처리하는 함수."""
    try:
        print(f"[INFO] Extracting text from the PDF file: {pdf_file_path}")
        result_folder = "./flask_server/split_txts"

        if not os.path.exists(result_folder):
            os.makedirs(result_folder)
        
        txt_files = {}
        with pdfplumber.open(pdf_file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                txt_file_name = f"page_{i + 1}.txt"
                txt_file_path = os.path.join(result_folder, txt_file_name)

                with open(txt_file_path, "w") as txt_file:
                    txt_file.write(text)

                txt_files[txt_file_name] = txt_file_path
                print(f"[INFO] Extracted text from page {i + 1} and saved to {txt_file_path}")
        
        print(f"[INFO] PDF processed successfully. Files saved in {result_folder}")
        return True

    except Exception as e:
        print(f"[ERROR] An error occurred during PDF processing: {str(e)}")
        return False

@app.route('/')
def home():
    return "Welcome to the Business Contract Analyzer!"

if __name__ == "__main__":
    pdf_file_path = "./pure_contract.pdf"
    success = process_pdf_local(pdf_file_path)
    
    if success:
        print("[INFO] PDF processed successfully in local environment.")
    else:
        print("[ERROR] Failed to process PDF in local environment.")
