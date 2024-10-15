import pandas as pd

def process_toxicity(file_path):
    """
    엑셀 파일을 읽어 Financial Impact와 Probability of Happening의 곱을 계산하고,
    독성 수준에 따라 'high', 'medium', 'low'로 나눠서 리스트를 반환하는 함수.
    
    Parameters:
        file_path (str): 엑셀 파일의 경로
    
    Returns:
        dict: 전체 항목 리스트와 'high', 'medium', 'low'로 나눠진 항목 리스트
    """
    
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

    # 결과를 딕셔너리 형태로 반환
    return {
        'all_items': all_items_list,
        'high_toxicity_items': high_list,
        'medium_toxicity_items': medium_list,
        'low_toxicity_items': low_list
    }

# 사용 예시
# file_path = 'C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/weights.xlsx'
# result = process_toxicity(file_path)
# print(result)

def main():
    """
    메인 함수. 파일 경로를 입력받고 독성 수준에 따른 리스트를 출력함.
    """
    # 파일 경로 입력
    file_path = 'C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/weights.xlsx'

    # 파일 경로를 기반으로 독성 수준을 처리하는 함수 호출
    result = process_toxicity(file_path)

    # 결과 출력
    print("All items list:", result['all_items'])
    print("High toxicity items:", result['high_toxicity_items'])
    print("Medium toxicity items:", result['medium_toxicity_items'])
    print("Low toxicity items:", result['low_toxicity_items'])

# 메인 함수 실행
if __name__ == "__main__":
    main()