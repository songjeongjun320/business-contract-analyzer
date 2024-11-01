import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

// POST 메서드로 요청 처리
export async function POST(req: Request) {
  const { data } = await req.json();
  console.log("Received request:", { data });

  // Vercel의 임시 디렉토리 경로 설정
  const isVercel = process.env.VERCEL_ENV === "production";
  const tmpDir = isVercel ? "/tmp" : path.resolve(process.cwd(), "tmp"); // 로컬에서 tmp 디렉토리 사용
  const baseFileName = "final_results.json";
  console.log("Directory for saving file:", tmpDir);

  // 디렉토리가 없으면 생성
  try {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
      console.log("Directory created:", tmpDir);
    }
  } catch (error) {
    console.error("Error creating directory:", error);
    return NextResponse.json(
      { error: "Failed to create directory" },
      { status: 500 }
    );
  }

  // 초기 파일 경로 설정
  let filePath = path.join(tmpDir, baseFileName);
  let count = 1;

  // 파일 이름 중복 방지
  while (fs.existsSync(filePath)) {
    console.log(`File ${filePath} exists, generating new file path...`);
    filePath = path.join(tmpDir, `final_results${count}.json`);
    console.log("New file path:", filePath);
    count++;
  }

  // 파일 저장
  try {
    console.log("Data to be saved:", data);
    console.log("Final file path:", filePath);
    fs.writeFileSync(filePath, data, "utf8");
    console.log("File saved successfully at:", filePath);
    return NextResponse.json({ message: "File saved successfully", filePath });
  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
