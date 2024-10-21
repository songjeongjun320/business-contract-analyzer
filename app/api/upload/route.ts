import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

// 임시 디렉토리 경로 설정
// const TEMP_DIRECTORY =
//   process.env.NODE_ENV === "production" ? "/tmp" : os.tmpdir();

// 'db' 디렉토리 경로 설정
const DB_DIRECTORY = path.join(process.cwd(), "app", "db");

const TEMP_DIRECTORY = DB_DIRECTORY;
// Python 스크립트 실행 함수
function runPythonScript(command: string) {
  return new Promise((resolve, reject) => {
    console.log(`Executing command: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script: ${stderr}`);
        reject(stderr);
      } else {
        console.log(`Script output: ${stdout}`);
        resolve(stdout);
      }
    });
  });
}

export async function POST(request: Request) {
  try {
    console.log("Received POST request to split PDF");

    const formData = await request.formData();
    const fileName = formData.get("fileName") as string;
    const file = formData.get("file") as Blob;

    if (!fileName || !file) {
      console.error("No file or file name provided in the form data");
      return NextResponse.json({ error: "No file specified" }, { status: 400 });
    }

    console.log(`File name received: ${fileName}`);

    // 임시 파일 경로 설정
    const tempFilePath = path.join(TEMP_DIRECTORY, fileName);
    console.log(`Temporary file path: ${tempFilePath}`);

    // 임시 파일 저장
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFilePath, fileBuffer);
    console.log(`File saved to temporary location: ${tempFilePath}`);

    // 출력 디렉토리 설정
    const outputDir = path.join(TEMP_DIRECTORY, "split_pdf_here");
    const output_txtDir = path.join(TEMP_DIRECTORY, "split_txt_here");

    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(output_txtDir, { recursive: true });

    console.log(`Output directory for PDFs: ${outputDir}`);
    console.log(`Output directory for TXTs: ${output_txtDir}`);

    // Python 명령어 준비 (환경에 따라 Python 경로 조정 필요)
    const pythonPath =
      process.env.NODE_ENV === "production"
        ? "python3"
        : "C:/Users/frank/AppData/Local/Programs/Python/Python312/python.exe";
    const scriptPath = path.join(
      process.cwd(),
      "app",
      "api",
      "upload",
      "pdf_processor.py"
    );
    const command = `"${pythonPath}" "${scriptPath}" "${tempFilePath}" "${outputDir}" "${output_txtDir}"`;

    console.log(`Prepared command: ${command}`);

    // Python 스크립트 실행
    const result = await runPythonScript(command);

    // 임시 파일 삭제
    await fs.unlink(tempFilePath);
    console.log(`Temporary file deleted: ${tempFilePath}`);

    return NextResponse.json({
      message: "PDF split successfully",
      files: result,
    });
  } catch (error) {
    console.error("Error splitting file:", error);
    return NextResponse.json({ error: "Failed to split PDF" }, { status: 500 });
  }
}
