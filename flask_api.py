from flask import Flask, jsonify
from model_create import process_toxicity  # model_create에서 process_toxicity 함수를 임포트

app = Flask(__name__)

# 이 엔드포인트는 process_toxicity 결과를 반환합니다.
@app.route("/process-toxicity", methods=["GET"])
def get_toxicity():
    try:
        # 실제 엑셀 파일 경로를 입력하세요.
        result = process_toxicity('C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/weights.xlsx')  # 실제 파일 경로로 수정
        return jsonify(result)  # JSON 형식으로 결과 반환
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)  # 로컬에서 5000번 포트로 실행
