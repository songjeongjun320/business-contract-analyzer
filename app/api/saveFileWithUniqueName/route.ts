import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

// POST 메서드로 요청 처리
export async function POST(req: Request) {
  const { data } = await req.json();
  console.log("Received request:", { data });

  // 기본 파일 이름과 폴더 경로 설정
  const baseDir = path.resolve(process.cwd(), "app/db/result");
  const baseFileName = "final_results.json";
  console.log("Base directory:", baseDir);

  // 디렉토리가 없으면 생성
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log("Directory created:", baseDir);
  }

  // 초기 파일 경로 설정
  let filePath = path.resolve(baseDir, baseFileName);
  let count = 1;

  // 파일 이름 중복 방지
  while (fs.existsSync(filePath)) {
    console.log(`File ${filePath} exists, generating new file path...`);
    filePath = path.resolve(baseDir, `final_results${count}.json`);
    console.log("New file path:", filePath);
    count++;
  }

  // 파일 저장
  try {
    fs.writeFileSync(filePath, data, "utf8");
    console.log("File saved successfully at:", filePath);
    return NextResponse.json({ message: "File saved successfully", filePath });
  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
