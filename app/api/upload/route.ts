import { NextRequest, NextResponse } from "next/server";
import path from "path";
import FormData from "form-data";
import fetch from "node-fetch";
import { Groq } from "groq-sdk";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import * as fsSync from "fs";

const execAsync = promisify(exec);

const ALLOWED_ORIGIN =
  "https://b-cntrct-anlyzer-flask-server-81e4bd0c510c.herokuapp.com";

// CORS 헤더를 설정하는 함수
const setCorsHeaders = (response: NextResponse) => {
  response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
};

// OPTIONS 핸들러 (CORS preflight 요청 처리)
export async function OPTIONS() {
  return setCorsHeaders(
    NextResponse.json({ message: "CORS preflight successful" })
  );
}

// POST 요청 핸들러
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== ALLOWED_ORIGIN) {
    return NextResponse.json(
      { error: "CORS Policy Error: Not allowed" },
      { status: 403 }
    );
  }

  const uploadDir = path.join(process.cwd(), "app/db/txt_results");
  await fs.mkdir(uploadDir, { recursive: true });

  const formData = await req.formData();

  // 파일 저장
  await Promise.all(
    Array.from(formData.entries()).map(async ([_, file]) => {
      if (file instanceof Blob) {
        const filename = (file as any).name || "unnamed.txt";
        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, buffer);
        console.log(`--Log: Saved file ${filename}`);
      }
    })
  );

  try {
    const weightsFilePath = path.join(process.cwd(), "app/db/weights.xlsx");

    if (
      !(await fs
        .access(weightsFilePath)
        .then(() => true)
        .catch(() => false))
    ) {
      console.error("--Log: weights.xlsx 파일이 존재하지 않습니다.");
      return setCorsHeaders(
        NextResponse.json(
          { error: "weights.xlsx 파일이 존재하지 않습니다." },
          { status: 500 }
        )
      );
    }

    const form = new FormData();
    form.append("file", await fs.readFile(weightsFilePath), {
      filename: "weights.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const flaskUrl =
      "https://b-cntrct-anlyzer-flask-server-81e4bd0c510c.herokuapp.com/model_weight";
    const responseFromFlask = await fetch(flaskUrl, {
      method: "POST",
      body: form as any,
      headers: form.getHeaders(),
    });

    const result = await responseFromFlask.json();

    if (responseFromFlask.ok) {
      console.log(
        "--Log: weights.xlsx 파일을 Flask 서버로 성공적으로 전송했습니다."
      );

      const dbDir = path.join(process.cwd(), "app/db");
      const resultDir = await getNextResultDir(dbDir);

      await fs.mkdir(resultDir, { recursive: true });
      console.log(`--Log: Created result directory: ${resultDir}`);

      const allResultsData = result.all_items.reduce(
        (acc: { [key: string]: any[] }, item: string) => {
          acc[item] = [];
          return acc;
        },
        {}
      );

      await Promise.all([
        fs.writeFile(
          path.join(resultDir, "all_results.json"),
          JSON.stringify(allResultsData, null, 2),
          "utf-8"
        ),
        fs.writeFile(
          path.join(resultDir, "base_data.json"),
          JSON.stringify(
            {
              high: result.high_toxicity_items || [],
              medium: result.medium_toxicity_items || [],
              low: result.low_toxicity_items || [],
            },
            null,
            2
          ),
          "utf-8"
        ),
        fs.writeFile(
          path.join(resultDir, "final_results.json"),
          JSON.stringify({ high: [], medium: [], low: [] }, null, 2),
          "utf-8"
        ),
      ]);

      console.log("--Log: Created all JSON files");

      try {
        await process_groq(resultDir);
        console.log("--Log: process_groq 함수 실행 완료");
      } catch (error) {
        console.error("--Log: process_groq 함수 실행 중 오류 발생:", error);
        return setCorsHeaders(
          NextResponse.json(
            {
              error: "process_groq 함수 실행 중 오류 발생",
              details: String(error),
            },
            { status: 500 }
          )
        );
      }

      return setCorsHeaders(
        NextResponse.json({
          message: "Files uploaded and results processed successfully",
          flaskResult: result,
        })
      );
    } else {
      console.error("--Log: Flask 서버에서 오류가 발생했습니다:", result);
      return setCorsHeaders(
        NextResponse.json(
          { error: "Flask 서버에서 오류가 발생했습니다.", details: result },
          { status: 500 }
        )
      );
    }
  } catch (error) {
    console.error("--Log: 처리 중 오류가 발생했습니다:", error);
    return setCorsHeaders(
      NextResponse.json(
        { error: "처리 중 오류가 발생했습니다.", details: String(error) },
        { status: 500 }
      )
    );
  }
}

async function getNextResultDir(baseDir: string): Promise<string> {
  let counter = 0;
  let resultDir: string;
  do {
    resultDir = path.join(
      baseDir,
      counter === 0 ? "result" : `result${counter}`
    );
    counter++;
  } while (fsSync.existsSync(resultDir));
  return resultDir;
}

async function process_groq(resultDir: string) {
  console.log("process_groq 함수 시작");

  const baseDataPath = path.join(resultDir, "base_data.json");
  const allResultsPath = path.join(resultDir, "all_results.json");

  try {
    const [baseDataContent, allResultContent] = await Promise.all([
      fs.readFile(baseDataPath, "utf-8"),
      fs.readFile(allResultsPath, "utf-8"),
    ]);

    const baseData = JSON.parse(baseDataContent);
    const allResultData = JSON.parse(allResultContent);

    const highItems = baseData.high || [];
    const mediumItems = baseData.medium || [];
    const lowItems = baseData.low || [];

    console.log("base_data.json에서 독성 수준 정보 가져오기 완료");

    const splitDir = path.join(process.cwd(), "app/db/txt_results");
    const files = await fs.readdir(splitDir);
    const textFiles = files.filter((file) => file.endsWith(".txt"));

    console.log("텍스트 파일들 발견:", textFiles);

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

    const results = await Promise.all(
      textFiles.map(async (fileName) => {
        const filePath = path.join(splitDir, fileName);
        const text = await fs.readFile(filePath, "utf-8");

        console.log(`파일 처리 중: ${fileName}`);
        console.time(`Groq API 요청 시간 for ${fileName}`);

        try {
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

          let jsonContent =
            response.choices?.[0]?.message?.content?.trim() || "";
          console.log(
            `Groq 응답 시작 ====================================================`
          );
          console.log(`${fileName}:`, jsonContent);
          console.log(
            `Groq 응답 끝 =======================================================`
          );

          if (jsonContent.includes("{") && jsonContent.includes("}")) {
            const startIndex = jsonContent.indexOf("{");
            const endIndex = jsonContent.lastIndexOf("}");
            jsonContent = jsonContent.substring(startIndex, endIndex + 1);
          }

          const categorizedClauses = JSON.parse(jsonContent);
          console.log("파싱된 분류 결과:", categorizedClauses);

          return categorizedClauses;
        } catch (error) {
          console.error(`파일 처리 중 오류 발생 ${fileName}:`, error);
          return null;
        }
      })
    );

    const successfulResults = results.filter(Boolean);
    console.log("성공한 결과 수:", successfulResults.length);
    console.log("오류 수:", results.length - successfulResults.length);

    if (successfulResults.length === 0) {
      throw new Error("파일 처리가 모두 실패했습니다.");
    }

    const finalResults = successfulResults.reduce(
      (acc, result) => {
        Object.entries(result).forEach(([key, values]) => {
          const arrayValues = values as any[]; // values를 배열로 간주합니다.

          if (highItems.includes(key)) {
            acc.high.push(...arrayValues);
          } else if (mediumItems.includes(key)) {
            acc.medium.push(...arrayValues);
          } else if (lowItems.includes(key)) {
            acc.low.push(...arrayValues);
          }
        });
        return acc;
      },
      { high: [], medium: [], low: [] }
    );
    await fs.writeFile(
      path.join(resultDir, "final_results.json"),
      JSON.stringify(finalResults, null, 2)
    );
    console.log("Final results saved to final_results.json");
  } catch (error) {
    console.error("Error in process_groq:", error);
    throw error;
  }

  console.log("process_groq 함수 완료");
}
