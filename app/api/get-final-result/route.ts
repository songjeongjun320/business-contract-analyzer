import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// 환경에 따른 기본 디렉토리 설정
const BASE_DIRECTORY =
  process.env.NODE_ENV === "production"
    ? "/tmp" // Vercel의 임시 디렉토리
    : path.join(process.cwd(), "/db"); // 로컬 환경의 tmp 디렉토리

console.log("BASE_DIRECTORY set to:", BASE_DIRECTORY);
console.log("Current NODE_ENV:", process.env.NODE_ENV);
console.log("Current working directory:", process.cwd());

// 가장 최신의 final_results 파일 찾기 함수
async function getLatestFinalResultsFile(baseDir: string) {
  try {
    console.log("Reading files from directory:", baseDir);
    const files = await fs.readdir(baseDir);
    console.log("Files found:", files);

    if (files.length === 0) {
      console.warn("Directory is empty.");
      return null;
    }

    const resultFiles = files
      .filter((file) => file.startsWith("final_results"))
      .map((file) => ({
        name: file,
        num:
          parseInt(file.replace("final_results", "").replace(".json", "")) || 0,
      }))
      .sort((a, b) => b.num - a.num);

    console.log("Filtered result files:", resultFiles);

    if (resultFiles.length > 0) {
      console.log("Latest result file determined:", resultFiles[0].name);
      return path.join(baseDir, resultFiles[0].name);
    } else {
      console.warn("No matching result files found.");
      return null;
    }
  } catch (error) {
    console.error("Failed to read files:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
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
  console.log("GET request received for final results.");
  console.log("Current timestamp:", new Date().toISOString());

  try {
    const latestResultFile = await getLatestFinalResultsFile(BASE_DIRECTORY);
    if (!latestResultFile) {
      console.error("No result files found.");
      return NextResponse.json(
        { error: "No result files found" },
        { status: 404 }
      );
    }

    console.log("Attempting to read JSON file from:", latestResultFile);
    const jsonData = await fs.readFile(latestResultFile, "utf-8");
    console.log("Raw JSON data:", jsonData);

    const parsedData = JSON.parse(jsonData);
    console.log("Parsed Data:", parsedData);

    const cleanedData = removeEmptyValues(parsedData);
    console.log("Cleaned Data:", cleanedData);

    if (process.env.NODE_ENV !== "production") {
      const updatedFilePath = path.join(
        BASE_DIRECTORY,
        `updated_${path.basename(latestResultFile)}`
      );
      await fs.writeFile(
        updatedFilePath,
        JSON.stringify(cleanedData, null, 2),
        "utf-8"
      );
      console.log("Updated cleaned data written to file:", updatedFilePath);
    }

    return NextResponse.json(cleanedData);
  } catch (error) {
    console.error("Failed to read or parse the JSON file:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Failed to read or parse the JSON file" },
      { status: 500 }
    );
  }
}
