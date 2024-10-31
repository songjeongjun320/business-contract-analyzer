import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import fetch from "node-fetch";
import { Groq } from "groq-sdk";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Allow POST requests from the specified origin
const ALLOWED_ORIGIN =
  "https://b-cntrct-anlyzer-flask-server-81e4bd0c510c.herokuapp.com";

export async function POST(req: Request) {
  const uploadDir = path.join(process.cwd(), "app/db/txt_results");

  // Check for allowed origin in request headers
  const origin = req.headers.get("origin");
  if (origin !== ALLOWED_ORIGIN) {
    return NextResponse.json(
      { error: "CORS Policy Error: Not allowed" },
      { status: 403 }
    );
  }

  // Add CORS headers
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");

  // 디렉토리가 없으면 생성
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 요청에서 FormData 추출
  const formData = await req.formData();

  // FormData 순회
  for (const [fieldName, file] of formData.entries()) {
    if (file instanceof Blob) {
      // 파일명 가져오기
      const filename = (file as any).name || "unnamed.txt";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 파일 저장 경로 설정
      const filePath = path.join(uploadDir, filename);

      // 파일 저장
      fs.writeFileSync(filePath, buffer);

      console.log(`--Log: Saved file ${filename}`);
    }
  }

  // Here is the logic for sending weights.xlsx to Flask server
  try {
    // Rest of your code follows as usual...
    const weightsFilePath = path.join(process.cwd(), "app/db/weights.xlsx");

    if (!fs.existsSync(weightsFilePath)) {
      console.error("--Log: weights.xlsx 파일이 존재하지 않습니다.");
      return NextResponse.json(
        { error: "weights.xlsx 파일이 존재하지 않습니다." },
        { status: 500 }
      );
    }

    // FormData 생성 및 요청 옵션 설정
    const form = new FormData();
    form.append("file", fs.createReadStream(weightsFilePath), {
      filename: "weights.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const flaskUrl = "http://127.0.0.1:5000/model_weight";
    const response = await fetch(flaskUrl, {
      method: "POST",
      body: form as any,
      headers: form.getHeaders(),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(
        "--Log: weights.xlsx 파일을 Flask 서버로 성공적으로 전송했습니다."
      );

      // 결과를 처리하여 JSON 파일 생성
      const dbDir = path.join(process.cwd(), "app/db");
      // result 디렉토리 이름 결정
      const resultDir = getNextResultDir(dbDir);

      // 디렉토리 생성
      fs.mkdirSync(resultDir, { recursive: true });
      console.log(`--Log: Created result directory: ${resultDir}`);

      // all_items에서 키를 생성하여 빈 배열을 값으로 하는 객체 생성
      const allItems = result.all_items; // 리스트 형태

      const allResultsData: { [key: string]: any[] } = {};
      allItems.forEach((item: string) => {
        allResultsData[item] = [];
      });

      // all_results.json 및 base_data.json 파일 저장
      const allResultsPath = path.join(resultDir, "all_results.json");
      fs.writeFileSync(
        allResultsPath,
        JSON.stringify(allResultsData, null, 2),
        "utf-8"
      );
      console.log("--Log: Created all_results.json");

      const baseData = {
        high: result.high_toxicity_items || [],
        medium: result.medium_toxicity_items || [],
        low: result.low_toxicity_items || [],
      };

      const baseDataPath = path.join(resultDir, "base_data.json");
      fs.writeFileSync(
        baseDataPath,
        JSON.stringify(baseData, null, 2),
        "utf-8"
      );
      console.log("--Log: Created base_data.json");

      // final_results.json 파일 생성
      const finalResultsData = {
        high: [],
        medium: [],
        low: [],
      };

      const finalResultsPath = path.join(resultDir, "final_results.json");
      fs.writeFileSync(
        finalResultsPath,
        JSON.stringify(finalResultsData, null, 2),
        "utf-8"
      );
      console.log("--Log: Created final_results.json");

      // 여기에서 process_groq 함수를 실행합니다.
      try {
        await process_groq(resultDir);
        console.log("--Log: process_groq 함수 실행 완료");
      } catch (error) {
        console.error("--Log: process_groq 함수 실행 중 오류 발생:", error);
        return NextResponse.json(
          {
            error: "process_groq 함수 실행 중 오류 발생",
            details: (error as Error).message || String(error),
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Files uploaded and results processed successfully",
        flaskResult: result,
      });
    } else {
      console.error("--Log: Flask 서버에서 오류가 발생했습니다:", result);
      return NextResponse.json(
        { error: "Flask 서버에서 오류가 발생했습니다.", details: result },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(
      "--Log: weights.xlsx 파일을 Flask 서버로 전송하는 중 오류가 발생했습니다:",
      error
    );
    return NextResponse.json(
      {
        error:
          "weights.xlsx 파일을 Flask 서버로 전송하는 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

// ==========================================================================================================================
// result 디렉토리의 이름을 결정하는 함수 ======================================================================================
function getNextResultDir(baseDir: string): string {
  let resultDir = path.join(baseDir, "result");
  let counter = 1;

  while (fs.existsSync(resultDir)) {
    resultDir = path.join(baseDir, `result${counter}`);
    counter++;
  }

  return resultDir;
}

// ==========================================================================================================================
// process_groq 함수 정의 ====================================================================================================
async function process_groq(resultDir: string) {
  console.log("process_groq 함수 시작");

  // 필요한 모듈들
  const fsPromises = fs.promises;

  // base_data.json 파일 경로
  const baseDataPath = path.join(resultDir, "base_data.json");
  // all_results.json 파일 경로
  const all_results_Path = path.join(resultDir, "all_results.json");

  // base_data.json에서 독성 수준 정보 가져오기
  let baseData: Record<string, string[]> = {};
  let allResultData: Record<string, string[]> = {};
  let highItems: string[] = [];
  let mediumItems: string[] = [];
  let lowItems: string[] = [];

  try {
    const baseDataContent = await fsPromises.readFile(baseDataPath, "utf-8");
    const baseDataJson = JSON.parse(baseDataContent);
    const allResultContent = await fsPromises.readFile(
      all_results_Path,
      "utf-8"
    );
    const allResultDataJson = JSON.parse(allResultContent);

    // baseData 초기화
    baseData = baseDataJson;
    // allResultData 초기화
    allResultData = allResultDataJson;

    // 독성 수준 항목 분류
    highItems = baseData.high || [];
    mediumItems = baseData.medium || [];
    lowItems = baseData.low || [];

    console.log("base_data.json에서 독성 수준 정보 가져오기 완료");
  } catch (error) {
    console.error("base_data.json 읽기 중 오류 발생:", error);
    throw error;
  }

  // split_txt_here 디렉토리 설정
  const splitDir = path.join(process.cwd(), "app/db/txt_results");

  // 텍스트 파일들 읽기
  const files = await fsPromises.readdir(splitDir);
  const textFiles = files.filter((file) => file.endsWith(".txt"));

  console.log("텍스트 파일들 발견:", textFiles);

  // Groq SDK 초기화
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
  });

  // 각 텍스트 파일 처리
  const results = await Promise.all(
    textFiles.map(async (fileName) => {
      const filePath = path.join(splitDir, fileName);
      const text = await fsPromises.readFile(filePath, "utf-8");

      console.log(`파일 처리 중: ${fileName}`);

      try {
        console.time(`Groq API 요청 시간 for ${fileName}`);

        // Groq API에 요청 보내기
        const response = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `This is a base_data.json file containing keys that represent clauses in a business contract: ${JSON.stringify(
                allResultData
              )}. Analyze the provided text and categorize the clauses according to these keys. Follow the rules below:

                    1. Do not create new keys.
                    2. Only use the existing keys from base_data.json.
                    3. Respond with a JSON format that matches the exact structure of base_data.json.
                    4. Extract relevant sentences from the provided text and add them as values in string format under the appropriate key in base_data.json.
                    5. If the relevant sentence is too long, summarize it to 1 or 2 sentences.`,
            },
            {
              role: "user",
              content: `Ensure the response format matches base_data.json. No comments, Just .json format\n\n${text}`,
            },
          ],
          model: "llama3-70b-8192",
        });

        console.timeEnd(`Groq API 요청 시간 for ${fileName}`);

        // 응답 파싱
        let jsonContent = response.choices?.[0]?.message?.content?.trim() || "";

        // 응답 내용 출력
        console.log(
          `Groq 응답 시작 ====================================================`
        );
        console.log(`${fileName}:`, jsonContent);
        console.log(
          `Groq 응답 끝 =======================================================`
        );

        // JSON 부분만 추출
        if (jsonContent.includes("{") && jsonContent.includes("}")) {
          const startIndex = jsonContent.indexOf("{");
          const endIndex = jsonContent.lastIndexOf("}");
          jsonContent = jsonContent.substring(startIndex, endIndex + 1);
        }

        let categorizedClauses;
        try {
          categorizedClauses = JSON.parse(jsonContent);
          console.log("파싱된 분류 결과:", categorizedClauses);
        } catch (error) {
          console.error(`Groq 응답 파싱 중 오류 발생 for ${fileName}:`, error);
          categorizedClauses = {}; // 빈 객체로 설정
        }

        // all_results.json 파일 경로
        const resultFileName = "all_results.json";
        const resultFilePath = path.join(resultDir, resultFileName);

        let existingData: Record<string, any[]> = {};
        try {
          const existingFileContent = await fsPromises.readFile(
            resultFilePath,
            "utf-8"
          );
          existingData = JSON.parse(existingFileContent);
        } catch {
          // 파일이 없으면 baseData를 복사하여 초기화
          existingData = {};
          Object.keys(baseData).forEach((key) => {
            existingData[key] = [];
          });
        }

        // 기존 데이터에 새로운 결과 추가
        Object.keys(categorizedClauses).forEach((key) => {
          if (Array.isArray(existingData[key])) {
            existingData[key].push(...categorizedClauses[key]);
          } else {
            existingData[key] = categorizedClauses[key];
          }
        });

        // 업데이트된 결과를 JSON 파일로 저장
        await fsPromises.writeFile(
          resultFilePath,
          JSON.stringify(existingData, null, 2)
        );
        console.log("업데이트된 결과를 JSON 파일에 저장 완료:", resultFileName);

        return { fileName: resultFileName, filePath: resultFilePath };
      } catch (error) {
        console.error(`파일 처리 중 오류 발생 ${fileName}:`, error);
        return {
          fileName: fileName,
          error: (error as Error).message || String(error),
        };
      }
    })
  );

  const successfulResults = results.filter((result) => !result.error);
  const errors = results.filter((result) => result.error);

  // 성공 및 오류 로그 출력
  console.log("성공한 결과 수:", successfulResults.length);
  console.log("오류 수:", errors.length);

  // 파일 처리가 하나도 성공하지 못한 경우 예외 발생
  if (successfulResults.length === 0) {
    throw new Error("파일 처리가 모두 실패했습니다.");
  }

  // 최종 결과 처리 시작
  console.log("최종 결과 처리를 시작합니다...");

  // all_results.json에서 각 키를 high, medium, low로 분류하여 최종 결과에 반영
  const allResultsPath = path.join(resultDir, "all_results.json");
  let finalHigh: string[] = [];
  let finalMedium: string[] = [];
  let finalLow: string[] = [];

  try {
    const allResultsContent = await fsPromises.readFile(
      allResultsPath,
      "utf-8"
    );
    const allResults = JSON.parse(allResultsContent);

    // 키 값을 기준으로 각 문장을 분류하여 high, medium, low 리스트에 추가
    Object.keys(allResults).forEach((key) => {
      const values = allResults[key];
      if (highItems.includes(key)) {
        finalHigh.push(...values);
      } else if (mediumItems.includes(key)) {
        finalMedium.push(...values);
      } else if (lowItems.includes(key)) {
        finalLow.push(...values);
      }
    });

    // final_results.json 파일을 생성 및 저장
    const finalResults = {
      high: finalHigh,
      medium: finalMedium,
      low: finalLow,
    };

    const finalResultsPath = path.join(resultDir, "final_results.json");
    await fsPromises.writeFile(
      finalResultsPath,
      JSON.stringify(finalResults, null, 2)
    );
    console.log("Final results saved to final_results.json");
  } catch (error) {
    console.error("Error reading or writing JSON files:", error);
    throw error;
  }

  console.log("process_groq 함수 완료");
}
