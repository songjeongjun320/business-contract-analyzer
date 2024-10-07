import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import {
  TextractClient,
  AnalyzeDocumentCommand,
} from "@aws-sdk/client-textract";

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

async function processWithTextract(filePath: string) {
  const client = new TextractClient({
    region: "your-aws-region",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const fileBuffer = await fs.readFile(filePath);

  const command = new AnalyzeDocumentCommand({
    Document: {
      Bytes: fileBuffer,
    },
    FeatureTypes: ["FORMS", "TABLES"],
  });

  try {
    const response = await client.send(command);
    const extractedText = response.Blocks?.filter(
      (block) => block.BlockType === "LINE"
    )
      .map((block) => block.Text)
      .join("\n");
    return extractedText;
  } catch (error) {
    console.error("Error processing document with Textract:", error);
    throw error;
  }
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
    await fs.mkdir(DB_DIRECTORY, { recursive: true });
    await fs.writeFile(filePath, buffer);

    const outputDir = path.join(DB_DIRECTORY, "split");
    await fs.mkdir(outputDir, { recursive: true });

    const command = `"C:/Users/frank/AppData/Local/Programs/Python/Python312/python.exe" "C:/Users/frank/Desktop/catching_hidden_claues/app/api/upload/pdf_splitter.py" "${filePath}" "${outputDir}"`;

    await runPythonScript(command);

    const splitFiles = await fs.readdir(outputDir);
    const textractResults = [];

    for (const splitFile of splitFiles) {
      const splitFilePath = path.join(outputDir, splitFile);
      const extractedText = await processWithTextract(splitFilePath);
      textractResults.push({ fileName: splitFile, text: extractedText });
    }

    // Save results to result_from_textract.txt
    const resultsFilePath = path.join(DB_DIRECTORY, "result_from_textract.txt");
    const resultsContent = textractResults
      .map((result) => `${result.fileName}:\n${result.text}\n\n`)
      .join("");
    await fs.writeFile(resultsFilePath, resultsContent);

    return NextResponse.json({
      message: "PDF split and processed successfully",
      results: textractResults,
    });
  } catch (error) {
    console.error("Error uploading or processing file:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
