import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const uploadDir = path.join(process.cwd(), "app/db/txt_results");

  // 디렉토리가 없으면 생성
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 요청에서 FormData 추출
  const formData = await req.formData();

  // FormData 순회
  for (const [fieldName, file] of formData.entries()) {
    if (file instanceof Blob) {
      // 파일명 가져오기
      const filename = (file as any).name || "unnamed.txt";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 파일 저장 경로 설정
      const filePath = path.join(uploadDir, filename);

      // 파일 저장
      fs.writeFileSync(filePath, buffer);

      console.log(`--Log: Saved file ${filename}`);
    }
  }

  return NextResponse.json({ message: "Files uploaded successfully" });
}
