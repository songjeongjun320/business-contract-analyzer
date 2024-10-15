import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// JSON 파일의 경로를 설정 ('all_results.json'을 'final_results.json'으로 변경)
const jsonFilePath = path.join(
  process.cwd(),
  "app/db/result",
  "final_results.json"
);

export async function GET() {
  console.log("Attempting to read JSON file from: ", jsonFilePath);
  try {
    // JSON 파일을 읽고 그 내용을 반환
    const jsonData = await fs.readFile(jsonFilePath, "utf-8");
    const parsedData = JSON.parse(jsonData);

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("Failed to read or parse the JSON file:", error);
    return NextResponse.json(
      { error: "Failed to read or parse the JSON file" },
      { status: 500 }
    );
  }
}
