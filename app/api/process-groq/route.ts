import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import fs from "fs/promises";
import path from "path";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 결과 파일이 저장될 디렉토리 설정 (db/result)
const RESULT_DIRECTORY = path.join(process.cwd(), "app/db/result");

export async function POST(request: Request) {
  console.log("POST request received");
  try {
    const splitDir = path.join(process.cwd(), "app/db/split_txt_here");
    console.log("Split directory set to:", splitDir);

    // Read the directory contents
    const files = await fs.readdir(splitDir);
    // Filter out only text files
    const textFiles = files.filter((file) => file.endsWith(".txt"));

    // Python API 서버에 GET 요청을 보내서 항목 리스트를 가져옴
    const pythonApiUrl = "http://127.0.0.1:5000/process-toxicity"; // IPv4 주소 사용
    const pythonApiResponse = await fetch(pythonApiUrl);
    const toxicityResult = await pythonApiResponse.json(); // Python API의 결과를 JSON으로 변환
    const allItemsList = toxicityResult.all_items; // 모든 아이템 리스트 가져오기

    // AI API 요청 전에 모든 아이템 리스트를 JSON 형식으로 저장
    let baseData: Record<string, string[]> = {};
    allItemsList.forEach((item: string) => {
      baseData[item] = []; // 각 item이 key가 되고 value는 빈 배열
    });

    // baseData를 db/result/base_data.json 파일로 저장
    const baseDataFilePath = path.join(RESULT_DIRECTORY, "base_data.json");
    await fs.writeFile(baseDataFilePath, JSON.stringify(baseData, null, 2));
    console.log("Saved baseData to base_data.json");

    // Process each text file
    const results = await Promise.all(
      textFiles.map(async (fileName) => {
        const filePath = path.join(splitDir, fileName);
        const text = await fs.readFile(filePath, "utf-8");

        try {
          console.time(`Groq API request for ${fileName}`);

          // AI API에 baseData를 함께 보내어 결과를 해당 형식에 맞춰 받기
          const response = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: `Here is a JSON structure representing contract clause items: ${JSON.stringify(
                  baseData
                )}. For each item in the list, find related clauses in the provided text. Your response should match the exact format below, filling each item with its related clauses. Return the response in the following JSON format:
                  
                  {
                    "item1": ["related clause 1", "related clause 2"],
                    "item2": ["related clause 1", "related clause 2"],
                    ...
                  }
                  
                  Do not include any additional explanations. Ignore any text that does not relate to the items.`,
              },
              {
                role: "user",
                content: `Here is the text to analyze:\n\n${text}`,
              },
            ],
            model: "llama3-8b-8192",
          });
          console.timeEnd(`Groq API request for ${fileName}`);
          console.log("Received response from Groq API for file:", fileName);
          console.log(
            "Raw response from Groq API:",
            response.choices?.[0]?.message?.content
          );

          // Parse response into JSON
          let jsonContent =
            response.choices?.[0]?.message?.content?.trim() || "";
          if (!jsonContent.endsWith("}")) {
            jsonContent += "}";
          }

          let categorizedClauses;
          try {
            categorizedClauses = JSON.parse(jsonContent);
            console.log("Successfully parsed clauses for file:", fileName);
          } catch (error) {
            console.error(
              `Error parsing Groq response for ${fileName}:`,
              error
            );
            categorizedClauses = baseData; // 기본 구조로 설정
          }

          const resultFileName = "all_results.json"; // 결과 파일은 모든 결과가 하나로 모아진 파일에 저장
          const resultFilePath = path.join(RESULT_DIRECTORY, resultFileName); // db/result 폴더에 저장

          // 기존 결과 파일이 있으면 불러오기
          let existingData: Record<string, string[]> = { ...baseData }; // baseData를 복사하여 기본 형식 유지

          try {
            const existingFileContent = await fs.readFile(
              resultFilePath,
              "utf-8"
            );
            existingData = JSON.parse(existingFileContent);
            console.log("Existing data loaded:", existingData);
          } catch (error) {
            console.log("No existing JSON file, creating a new one.");
          }

          // 새 결과를 기존 데이터에 추가
          (
            Object.keys(categorizedClauses) as Array<keyof typeof existingData>
          ).forEach((categoryKey) => {
            if (!Array.isArray(existingData[categoryKey])) {
              existingData[categoryKey] = [];
            }

            existingData[categoryKey] = [
              ...existingData[categoryKey],
              ...categorizedClauses[categoryKey].filter(
                (clause: string) => !!clause
              ),
            ];
          });

          // Save the updated result to the JSON file (결과를 기존 파일에 덧붙여 저장)
          try {
            await fs.writeFile(
              resultFilePath,
              JSON.stringify(existingData, null, 2)
            );
            console.log("Saved updated result to JSON file:", resultFileName);
          } catch (writeError) {
            console.error(
              `Error saving updated result for ${fileName}:`,
              writeError
            );
          }

          return { fileName: resultFileName, filePath: resultFilePath };
        } catch (error) {
          console.error(`Error processing ${fileName} with Groq:`, error);
          return {
            fileName: fileName,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    const successfulResults = results.filter((result) => !result.error);
    const errors = results.filter((result) => result.error);

    console.log("Successful results count:", successfulResults.length);
    console.log("Errors count:", errors.length);

    if (errors.length > 0) {
      console.error("Errors occurred during processing:", errors);
    }

    if (successfulResults.length === 0) {
      throw new Error("No files were successfully processed");
    }

    return NextResponse.json({
      results: successfulResults,
      errors,
    });
  } catch (error) {
    console.error("Error processing with Groq:", error);
    return NextResponse.json(
      {
        error: "Failed to process with Groq",
        details: (error as Error).message || String(error),
      },
      { status: 500 }
    );
  }
}
