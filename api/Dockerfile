# Python 이미지 선택 (예: Python 3.9)
FROM python:3.9-slim

# 작업 디렉토리 설정
WORKDIR /app

# 필요 파일들을 복사
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY . .

# Flask 애플리케이션 실행 포트 설정 (Fly.io 환경에 맞춰 8080 사용)
ENV PORT 8080
ENV PYTHONUNBUFFERED=1

# 애플리케이션 실행
CMD ["python", "application.py"]
