import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = "result";

// Supabase에서 최신 final_results.json 파일 가져오기 함수
async function getFinalResultsFile(fileName: string) {
  try {
    console.log(`Fetching ${fileName} from Supabase Storage...`);

    // Supabase Storage에서 특정 파일 다운로드
    const { data: fileData, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(fileName);

    if (error) {
      console.error(
        `Failed to download ${fileName} from Supabase Storage:`,
        error
      );
      return null;
    }

    const fileText = await fileData.text();
    console.log("Raw file content:", fileText);

    const parsedData = JSON.parse(fileText);
    console.log("Parsed JSON content:", parsedData); // JSON 파싱 후 출력
    return parsedData; // JSON 데이터로 반환
  } catch (error) {
    console.error(`Failed to fetch ${fileName}:`, error);
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
export async function GET(req: Request) {
  const url = new URL(req.url);
  const fileName = url.searchParams.get("fileName") || "final_results.json"; // 기본 파일명 설정

  console.log(`Fetching ${fileName} from Supabase Storage...`);
  console.log("Current timestamp:", new Date().toISOString());

  // 대기 시간 추가 (필요 시 조정 가능)
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    const parsedData = await getFinalResultsFile(fileName); // 여기서 파일명 전달
    if (!parsedData) {
      console.error(`No ${fileName} file found.`);
      return NextResponse.json(
        { error: `No ${fileName} file found` },
        { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } } // 캐시 방지 헤더 추가
      );
    }

    console.log("Parsed Data:", parsedData);

    const cleanedData = removeEmptyValues(parsedData);
    console.log("Cleaned Data:", cleanedData);

    // 캐시 방지를 위해 헤더 설정
    return NextResponse.json(cleanedData, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Failed to read or parse the JSON file:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Failed to read or parse the JSON file" },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
