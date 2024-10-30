import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// 환경에 따른 기본 디렉토리 설정
const BASE_DIRECTORY =
  process.env.NODE_ENV === "production"
    ? "/tmp"
    : path.join(process.cwd(), "app/db");

// 가장 최신의 result 디렉토리 찾기 함수
async function getLatestResultDirectory(baseDir: string) {
  try {
    const directories = await fs.readdir(baseDir, { withFileTypes: true });
    const resultDirs = directories
      .filter((dir) => dir.isDirectory() && dir.name.startsWith("result"))
      .map((dir) => ({
        name: dir.name,
        num: parseInt(dir.name.replace("result", "")) || 0,
      }))
      .sort((a, b) => b.num - a.num);

    return resultDirs.length > 0
      ? path.join(baseDir, resultDirs[0].name)
      : null;
  } catch (error) {
    console.error("Failed to read directories:", error);
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
    const latestResultDir = await getLatestResultDirectory(BASE_DIRECTORY);

    if (!latestResultDir) {
      console.error("No result directories found.");
      return NextResponse.json(
        { error: "No result directories found" },
        { status: 404 }
      );
    }

    const jsonFilePath = path.join(latestResultDir, "final_results.json");

    console.log("Attempting to read JSON file from: ", jsonFilePath);

    // JSON 파일을 읽고 그 내용을 반환
    const jsonData = await fs.readFile(jsonFilePath, "utf-8");
    const parsedData = JSON.parse(jsonData);
    console.log("Parsed Data:", parsedData);

    const cleanedData = removeEmptyValues(parsedData);
    console.log("Cleaned Data:", cleanedData);

    // 프로덕션 환경에서는 파일 쓰기를 하지 않습니다.
    if (process.env.NODE_ENV !== "production") {
      await fs.writeFile(
        jsonFilePath,
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
