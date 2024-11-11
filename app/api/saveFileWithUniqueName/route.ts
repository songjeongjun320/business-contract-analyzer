import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type FinalData = {
  high: any[];
  medium: any[];
  low: any[];
};

export async function POST(req: Request) {
  const { data } = await req.json();
  console.log("Received request:", { data });

  // Vercel의 임시 디렉토리 경로 설정
  const isVercel = process.env.VERCEL_ENV === "production";
  const tmpDir = isVercel ? "/tmp" : path.resolve(process.cwd(), "db"); // 로컬에서는 db 디렉토리 사용
  const baseFileName = "final_results.json";
  let filePath = path.join(tmpDir, baseFileName);
  let count = 1;

  try {
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
      console.log("Directory created:", tmpDir);
    }

    // 요청마다 독립된 finalData 객체 생성 및 데이터 파싱/합치기
    const finalData: FinalData = { high: [], medium: [], low: [] };
    data.forEach((item: string) => {
      const parsedItem = JSON.parse(item);
      if (parsedItem.high && Array.isArray(parsedItem.high))
        finalData.high.push(...parsedItem.high);
      if (parsedItem.medium && Array.isArray(parsedItem.medium))
        finalData.medium.push(...parsedItem.medium);
      if (parsedItem.low && Array.isArray(parsedItem.low))
        finalData.low.push(...parsedItem.low);
    });

    // JSON 문자열로 변환 후 파일 저장
    const finalDataString = JSON.stringify(finalData, null, 2);
    fs.writeFileSync(filePath, finalDataString, "utf8");
    console.log("File saved successfully at:", filePath);

    // Supabase Storage에 업로드
    const fileBuffer = fs.readFileSync(filePath);

    // Supabase에 파일 업로드
    const { data: uploadData, error } = await supabase.storage
      .from("result")
      .upload("final_results.json", fileBuffer, {
        contentType: "application/json",
        upsert: true, // 덮어쓰기 옵션
      });

    if (error) throw error;

    console.log("File uploaded successfully to Supabase:", uploadData);

    const supabasePath = `result/final_results.json`; // Define supabasePath

    // 성공적으로 저장 및 업로드되었음을 응답
    return NextResponse.json({
      message: "File saved locally and uploaded to Supabase successfully",
      localPath: filePath,
      supabasePath: supabasePath,
    });
  } catch (error) {
    console.error("Error during file saving or uploading:", error);
    return NextResponse.json(
      { error: "Failed to save or upload file" },
      { status: 500 }
    );
  }
}
