import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// 환경에 따른 기본 디렉토리 설정
const BASE_DIRECTORY =
  process.env.NODE_ENV === "production"
    ? "/tmp" // Vercel의 임시 디렉토리
    : path.join(process.cwd(), "app/db/result"); // 로컬 환경의 기본 디렉토리

// 가장 최신의 final_results 파일 찾기 함수
async function getLatestFinalResultsFile(baseDir: string) {
  try {
    const files = await fs.readdir(baseDir);
    const resultFiles = files
      .filter((file) => file.startsWith("final_results"))
      .map((file) => ({
        name: file,
        num:
          parseInt(file.replace("final_results", "").replace(".json", "")) || 0,
      }))
      .sort((a, b) => b.num - a.num);

    return resultFiles.length > 0
      ? path.join(baseDir, resultFiles[0].name)
      : null;
  } catch (error) {
    console.error("Failed to read files:", error);
    return null;
  }
}

function removeEmptyValues(jsonData: any) {
  const cleanedData: any = {};
  for (const key in jsonData) {
    if (Array.isArray(jsonData[key])) {
      cleanedData[key] = jsonData[key].filter((value: string) => value !== "");
    } else {
      cleanedData[key] = jsonData[key];
    }
  }
  return cleanedData;
}

export async function GET() {
  try {
    const latestResultFile = await getLatestFinalResultsFile(BASE_DIRECTORY);

    if (!latestResultFile) {
      console.error("No result files found.");
      return NextResponse.json(
        { error: "No result files found" },
        { status: 404 }
      );
    }

    console.log("Attempting to read JSON file from: ", latestResultFile);

    // JSON 파일을 읽고 그 내용을 반환
    const jsonData = await fs.readFile(latestResultFile, "utf-8");
    const parsedData = JSON.parse(jsonData);
    console.log("Parsed Data:", parsedData);

    const cleanedData = removeEmptyValues(parsedData);
    console.log("Cleaned Data:", cleanedData);

    // 프로덕션 환경에서는 파일 쓰기를 하지 않습니다.
    if (process.env.NODE_ENV !== "production") {
      await fs.writeFile(
        latestResultFile,
        JSON.stringify(cleanedData, null, 2),
        "utf-8"
      );
    }

    return NextResponse.json(cleanedData);
  } catch (error) {
    console.error("Failed to read or parse the JSON file:", error);
    return NextResponse.json(
      { error: "Failed to read or parse the JSON file" },
      { status: 500 }
    );
  }
}
