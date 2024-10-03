import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promises as fs } from "fs";
import path from "path";

// Set the path to the 'db' directory
const DB_DIRECTORY = path.join(process.cwd(), "app/db");

// Helper function to execute the Python script as a promise
function runPythonScript(command: string) {
  return new Promise((resolve, reject) => {
    console.log(`Executing command: ${command}`); // Log the command being executed
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
    console.log("Received POST request to split PDF"); // 로그 추가

    const formData = await request.formData();
    const fileName = formData.get("fileName") as string;
    const file = formData.get("file");

    if (!fileName || !file) {
      console.error("No file or file name provided in the form data");
      return NextResponse.json({ error: "No file specified" }, { status: 400 });
    }

    // Log the file name and ensure it's passed correctly
    console.log(`File name received: ${fileName}`);

    const filePath = path.join(DB_DIRECTORY, fileName);

    // Log the file path where the file will be stored
    console.log(`File path: ${filePath}`);

    // Ensure the 'split' folder exists
    const outputDir = path.join(DB_DIRECTORY, "split");
    await fs.mkdir(outputDir, { recursive: true });

    // Log the output directory for split files
    console.log(`Output directory: ${outputDir}`);

    // Prepare the Python command with the full path to the Python executable
    const command = `"C:/Users/frank/AppData/Local/Programs/Python/Python312/python.exe" app/api/upload/pdf_splitter.py "${filePath}" "${outputDir}"`;

    // Log the full Python command to be executed
    console.log(`Prepared command: ${command}`);

    // Execute the Python command to split the PDF
    const result = await runPythonScript(command);

    // Return a successful response with the output from the script
    console.log("PDF split successfully");
    return NextResponse.json({
      message: "PDF split successfully",
      files: result,
    });
  } catch (error) {
    console.error("Error splitting file:", error); // 오류 로그 추가
    return NextResponse.json({ error: "Failed to split PDF" }, { status: 500 });
  }
}
