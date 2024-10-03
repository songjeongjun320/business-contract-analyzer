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
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const fileName = formData.get("fileName") as string;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Get file array buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Generate a unique filename with a timestamp
  const filePath = path.join(DB_DIRECTORY, fileName);

  try {
    // Ensure the 'db' folder exists
    await fs.mkdir(DB_DIRECTORY, { recursive: true });

    // Write the uploaded file to the 'db' folder
    await fs.writeFile(filePath, buffer);

    // Prepare the command to execute the Python script directly
    const outputDir = path.join(DB_DIRECTORY, "split");
    await fs.mkdir(outputDir, { recursive: true });

    const command = `"C:/Users/frank/AppData/Local/Programs/Python/Python312/python.exe" "C:/Users/frank/Desktop/catching_hidden_claues/app/api/upload/pdf_splitter.py" "${filePath}" "${outputDir}"`;

    // Execute the Python script to split the PDF
    const result = await runPythonScript(command);

    // Return a successful response with the output from the script
    return NextResponse.json({
      message: "PDF split successfully",
      files: result,
    });
  } catch (error) {
    console.error("Error uploading or processing file:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
