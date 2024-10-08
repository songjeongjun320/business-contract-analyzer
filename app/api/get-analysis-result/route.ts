import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// JSON 파일의 경로를 'all_results.json'으로 변경
const jsonFilePath = path.join(
  "C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/app/db/split_txt_here/",
  "all_results.json"
);

export async function GET() {
  console.log("Attempting to read JSON file from: ", jsonFilePath);
  try {
    // JSON 파일을 읽고 그 내용을 반환
    const jsonData = fs.readFileSync(jsonFilePath, "utf-8");
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
