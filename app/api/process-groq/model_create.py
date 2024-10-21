import pandas as pd
import json

def process_toxicity(file_path):
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

def main():
    file_path = 'C:/Users/frank/Desktop/business-contract-analyzer/weights.xlsx'

    # 파일 경로를 기반으로 독성 수준을 처리하는 함수 호출
    result = process_toxicity(file_path)

    # JSON 형식으로 출력
    print(result)

if __name__ == "__main__":
    main()
