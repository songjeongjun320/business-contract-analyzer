import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 버킷 이름 설정 (Supabase에서 설정한 버킷 이름을 사용)
const BUCKET_NAME = "result";
const FILE_NAME = "final_results.json"; // 무조건 이 파일을 가져오도록 설정

// final_results.json 파일 가져오기 함수
async function getFinalResultsFile() {
  try {
    console.log("Fetching final_results.json from Supabase Storage...");

    // Supabase Storage에서 특정 파일 다운로드
    const { data: fileData, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(FILE_NAME);

    if (error) {
      console.error("Failed to download file from Supabase Storage:", error);
      return null;
    }

    const fileText = await fileData.text();
    return JSON.parse(fileText); // JSON 데이터로 파싱하여 반환
  } catch (error) {
    console.error("Failed to fetch final_results.json:", error);
    return null;
  }
}

// 비어 있는 값 제거 함수
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
    const parsedData = await getFinalResultsFile();
    if (!parsedData) {
      console.error("No final_results.json file found.");
      return NextResponse.json(
        { error: "No final_results.json file found" },
        { status: 404 }
      );
    }

    console.log("Parsed Data:", parsedData);

    const cleanedData = removeEmptyValues(parsedData);
    console.log("Cleaned Data:", cleanedData);

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
