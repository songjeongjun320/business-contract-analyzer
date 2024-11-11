import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

// Define the type for finalData
type FinalData = {
  high: any[]; // You can replace 'any' with a more specific type if known
  medium: any[];
  low: any[];
};

// POST 메서드로 요청 처리
export async function POST(req: Request) {
  const { data } = await req.json();
  console.log("Received request:", { data });

  // Vercel의 임시 디렉토리 경로 설정
  const isVercel = process.env.VERCEL_ENV === "production";
  const tmpDir = isVercel ? "/tmp" : path.resolve(process.cwd(), "db"); // 로컬에서 tmp 디렉토리 사용
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

  // 요청마다 독립된 finalData 객체 생성
  const finalData: FinalData = { high: [], medium: [], low: [] };

  // 데이터를 재가공하여 합치기
  data.forEach((item: string) => {
    const parsedItem = JSON.parse(item); // 문자열을 JSON 객체로 파싱

    // high, medium, low를 각각 누적
    if (parsedItem.high && Array.isArray(parsedItem.high)) {
      finalData.high.push(...parsedItem.high);
    }
    if (parsedItem.medium && Array.isArray(parsedItem.medium)) {
      finalData.medium.push(...parsedItem.medium);
    }
    if (parsedItem.low && Array.isArray(parsedItem.low)) {
      finalData.low.push(...parsedItem.low);
    }
  });

  // JSON 문자열로 변환
  const finalDataString = JSON.stringify(finalData, null, 2);

  // 파일 저장
  try {
    console.log("Data to be saved:", finalDataString);
    console.log("Final file path:", filePath);
    fs.writeFileSync(filePath, finalDataString, "utf8");
    console.log("File saved successfully at:", filePath);
    return NextResponse.json({ message: "File saved successfully", filePath });
  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
