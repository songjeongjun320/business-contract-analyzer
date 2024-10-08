import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promises as fs } from "fs";
import path from "path";

const DB_DIRECTORY = path.join(process.cwd(), "app/db");

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
  const formData = await request.formData();
  const file = formData.get("file") as File;
  let fileName = formData.get("fileName") as string;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!fileName) {
    fileName = `uploaded_file_${Date.now()}.pdf`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const filePath = path.join(DB_DIRECTORY, fileName);

  try {
    // Create directories if they do not exist
    await fs.mkdir(DB_DIRECTORY, { recursive: true });
    await fs.writeFile(filePath, buffer);

    const outputDir = path.join(DB_DIRECTORY, "split");
    await fs.mkdir(outputDir, { recursive: true });

    // Run the PDF splitter script
    const command = `"C:/Users/frank/AppData/Local/Programs/Python/Python312/python.exe" "C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/app/api/upload/pdf_processor.py" "${filePath}" "${outputDir}"`;
    await runPythonScript(command);

    // Read the split PDF files from the output directory
    const splitFiles = await fs.readdir(outputDir);

    // Assuming further processing like saving PDF pages or logging results
    const pdfResults = splitFiles.map((file) => ({
      fileName: file,
      filePath: path.join(outputDir, file),
    }));

    return NextResponse.json({
      message: "PDF split and reading successfully",
      results: pdfResults,
    });
  } catch (error) {
    console.error("Error uploading or processing file:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
