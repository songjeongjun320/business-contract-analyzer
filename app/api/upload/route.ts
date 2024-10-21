import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "../../lib/supabaseClient";
import axios from "axios";

// Supabase 버킷 설정
const SUPABASE_BUCKET = "pdf-uploads";

// Flask 서버의 엔드포인트 URL
const FLASK_NOTIFY_URL =
  process.env.FLASK_NOTIFY_URL || "http://localhost:5000/api/new-pdf";

// 파일을 Supabase에 업로드하는 함수
async function uploadToSupabase(file: Blob, filename: string) {
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(`pdfs/${filename}`, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  console.log(`[INFO] File uploaded to Supabase: ${data.path}`);
  return data.path;
}

// 확장된 Next.js API 요청 타입
interface ExtendedNextApiRequest extends NextApiRequest {
  formData: () => Promise<FormData>;
}

// 미들웨어 적용 함수
async function applyMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  next: Function
) {
  console.log(`Request Method: ${req.method}, Request URL: ${req.url}`);
  const authToken = req.headers["authorization"];
  if (!authToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// POST 핸들러 정의
export async function POST(req: ExtendedNextApiRequest, res: NextApiResponse) {
  await applyMiddleware(req, res, async () => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        console.warn("[WARNING] No file uploaded.");
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`[INFO] File uploaded: ${file.name}`);

      // Supabase에 파일 업로드
      const uploadedPath = await uploadToSupabase(file, file.name);

      // Flask 서버에 알림
      await axios.post(FLASK_NOTIFY_URL, { path: uploadedPath });

      console.log(`[INFO] Notified Flask server: ${uploadedPath}`);

      // 성공 응답
      res.status(200).json({
        message: "File uploaded successfully and Flask notified.",
        path: uploadedPath,
      });
    } catch (error: any) {
      console.error("[ERROR] Upload error:", error.message);
      res.status(500).json({ error: "An error occurred during upload" });
    }
  });
}
