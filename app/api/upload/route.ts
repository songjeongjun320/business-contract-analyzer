// app/api/upload/route.ts

import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { createRouter, expressWrapper } from "next-connect";
import formidable, { File as FormidableFile, Fields, Files } from "formidable";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import os from "os";

// Flask 서버의 `/process-pdf` 엔드포인트 URL
const FLASK_PROCESS_PDF_URL =
  process.env.NEXT_PUBLIC_FLASK_PROCESS_PDF_URL ||
  "http://localhost:5000/process-pdf";

// Flask 서버의 기본 URL
const FLASK_BASE_URL =
  process.env.NEXT_PUBLIC_FLASK_BASE_URL || "http://localhost:5000";

// API 키
const API_KEY = process.env.API_KEY || "your_default_api_key";

// Formidable 설정: 파일 파싱 함수
const parseForm = (
  req: NextApiRequest
): Promise<{ fields: Fields; files: Files }> => {
  const form = formidable({ multiples: false, keepExtensions: true });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

// 파일 다운로드 및 저장 함수 정의
async function downloadAndSaveFile(
  url: string,
  savePath: string,
  apiKey: string
): Promise<void> {
  const writer = fs.createWriteStream(savePath);
  const response = await axios.get(url, {
    responseType: "stream",
    headers: { "x-api-key": apiKey },
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// `next-connect`를 사용해 API 핸들러 생성
const handler = createRouter<NextApiRequest, NextApiResponse>();

handler.post(async (req, res) => {
  try {
    const { fields, files } = await parseForm(req);
    const uploadedFile = files.file as FormidableFile | FormidableFile[];

    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileName = file.originalFilename || "uploaded_file.pdf";

    const formData = new FormData();
    formData.append("file", fs.createReadStream(file.filepath), fileName);
    formData.append("fileName", fileName);

    const response = await axios.post(FLASK_PROCESS_PDF_URL, formData, {
      headers: { ...formData.getHeaders(), "x-api-key": API_KEY },
      timeout: 60000,
    });

    const data = response.data;
    const baseTempDir = path.join(os.tmpdir(), "business-contract-analyzer");
    const resultDir = path.join(baseTempDir, "result");
    const splitPdfsDir = path.join(resultDir, "split_pdfs");
    const splitTxtsDir = path.join(resultDir, "split_txts");

    fs.mkdirSync(splitPdfsDir, { recursive: true });
    fs.mkdirSync(splitTxtsDir, { recursive: true });

    const {
      processed_pdfs,
      processed_txts,
      pdf_download_urls,
      txt_download_urls,
    } = data;

    for (const pdfFileName of processed_pdfs) {
      const pdfUrl = pdf_download_urls[pdfFileName];
      const savePath = path.join(splitPdfsDir, pdfFileName);
      await downloadAndSaveFile(
        `${FLASK_BASE_URL}${pdfUrl}`,
        savePath,
        API_KEY
      );
    }

    for (const txtFileName of processed_txts) {
      const txtUrl = txt_download_urls[txtFileName];
      const savePath = path.join(splitTxtsDir, txtFileName);
      await downloadAndSaveFile(
        `${FLASK_BASE_URL}${txtUrl}`,
        savePath,
        API_KEY
      );
    }

    fs.unlinkSync(file.filepath);

    res.status(200).json({
      message: "PDF split successfully",
      result_directory: resultDir,
      split_pdfs: processed_pdfs,
      split_txts: processed_txts,
    });
  } catch (error: any) {
    console.error("Error uploading file to Flask server:", error.message);

    if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data.error || "Error processing PDF on server",
      });
    } else if (error.request) {
      res.status(502).json({ error: "No response from Flask server" });
    } else {
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
});

export default handler;
