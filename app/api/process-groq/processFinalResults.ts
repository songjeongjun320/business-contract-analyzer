import fs from "fs/promises";
import path from "path";

const RESULT_DIRECTORY = path.join(process.cwd(), "app/db/result");

export async function processFinalResults(
  highItems: string[], 
  mediumItems: string[], 
  lowItems: string[]
) {
  try {
    // all_results.json 경로 설정
    const allResultsFilePath = path.join(RESULT_DIRECTORY, "all_results.json");
    // final_results.json 경로 설정
    const finalResultsFilePath = path.join(
      RESULT_DIRECTORY,
      "final_results.json"
    );

    // all_results.json 파일 읽기
    const allResultsContent = await fs.readFile(allResultsFilePath, "utf-8");
    const allResults = JSON.parse(allResultsContent) || {};

    // 최종 결과를 담을 구조 초기화
    const finalResults: Record<string, string[]> = {
      high: [],
      medium: [],
      low: [],
    };

    // all_results에 담긴 데이터를 high, medium, low로 분류
    Object.entries(allResults).forEach(([key, value]) => {
      const valuesArray = Array.isArray(value) ? (value as string[]) : [];
      if (highItems.includes(key)) {
        finalResults.high.push(...valuesArray);
      } else if (mediumItems.includes(key)) {
        finalResults.medium.push(...valuesArray);
      } else if (lowItems.includes(key)) {
        finalResults.low.push(...valuesArray);
      }
    });

    // 최종 결과를 final_results.json 파일로 저장
    await fs.writeFile(
      finalResultsFilePath,
      JSON.stringify(finalResults, null, 2)
    );
    console.log("final_results.json 생성 완료");
  } catch (error) {
    // 에러 발생 시 로그 출력
    console.error("최종 결과 처리 중 에러 발생:", error);
  }
}
