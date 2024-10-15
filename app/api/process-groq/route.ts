import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process"; // Fixed the quote mismatch
import { processFinalResults } from "./processFinalResults"; // Import the final result processor

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Directory paths
const RESULT_DIRECTORY = path.join(process.cwd(), "app/db/result");

export async function POST(request: Request) {
  console.log("POST request received");
  try {
    const splitDir = path.join(process.cwd(), "app/db/split_txt_here");
    console.log("Split directory set to:", splitDir);

    // Read text files from the split directory
    const files = await fs.readdir(splitDir);
    const textFiles = files.filter((file) => file.endsWith(".txt"));

    // Define the path to the Python executable
    const pythonExecutable =
      "C:/Users/frank/AppData/Local/Programs/Python/Python312/python.exe";

    // Define the path to the Python script
    const pythonScriptPath =
      "C:/Users/frank/Desktop/toxic_clauses_detector_in_business_contract/app/api/process-groq/model_create.py";

    // Execute Python script to fetch toxicity data
    const { stdout, stderr } = await execFile(pythonExecutable, [
      pythonScriptPath,
    ]);

    if (stderr) {
      console.error("Error running Python script:", stderr);
      throw new Error(String(stderr)); // Convert stderr to string
    }

    // Parse the output from the Python script
    const toxicityResult = JSON.parse(String(stdout));

    // Define toxicity categories
    const allItemsList = toxicityResult.all_items;
    const highItems = toxicityResult.high_toxicity_items;
    const mediumItems = toxicityResult.medium_toxicity_items;
    const lowItems = toxicityResult.low_toxicity_items;

    // Initialize baseData
    let baseData: Record<string, string[]> = {};
    allItemsList.forEach((item: string) => {
      baseData[item] = [];
    });

    // Ensure result directory exists
    try {
      await fs.access(RESULT_DIRECTORY);
    } catch {
      await fs.mkdir(RESULT_DIRECTORY, { recursive: true });
    }

    // Path for base data
    const baseDataFilePath = path.join(RESULT_DIRECTORY, "base_data.json");

    // Create base_data.json if it doesn't exist
    try {
      await fs.access(baseDataFilePath);
    } catch {
      await fs.writeFile(baseDataFilePath, JSON.stringify(baseData, null, 2));
    }

    // Process each text file
    const results = await Promise.all(
      textFiles.map(async (fileName) => {
        const filePath = path.join(splitDir, fileName);
        const text = await fs.readFile(filePath, "utf-8");

        try {
          console.time(`Groq API request for ${fileName}`);

          // Send request to Groq API
          const response = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: `We have a JSON file called base_data.json which contains various keys that represent contract clause items: ${JSON.stringify(
                  baseData
                )}. Your task is to analyze the text I will provide and categorize the relevant clauses into the appropriate keys in the JSON structure.`,
              },
              {
                role: "user",
                content: `Find the clauses that correspond to each key in the provided JSON from the following text. Do not include any explanations. Only respond in a valid .json format that matches the structure of base_data.json.\n\n${text}`,
              },
            ],
            model: "llama3-8b-8192",
          });

          console.timeEnd(`Groq API request for ${fileName}`);

          // Parse response from Groq API
          let jsonContent =
            response.choices?.[0]?.message?.content?.trim() || "";

          // API 결과를 콘솔에 출력
          console.log(jsonContent);

          if (!jsonContent.endsWith("}")) {
            jsonContent += "}";
          }

          let categorizedClauses;
          try {
            categorizedClauses = JSON.parse(jsonContent);
          } catch (error) {
            console.error(
              `Error parsing Groq response for ${fileName}:`,
              error
            );
            categorizedClauses = baseData; // Fallback to baseData
          }

          // Path to save all results
          const resultFileName = "all_results.json";
          const resultFilePath = path.join(RESULT_DIRECTORY, resultFileName);

          let existingData: Record<string, any[]> = {}; // Define existingData with a specific type
          try {
            // Read existing file if it exists
            const existingFileContent = await fs.readFile(
              resultFilePath,
              "utf-8"
            );
            existingData = JSON.parse(existingFileContent);
          } catch (error) {
            // If the file doesn't exist, we initialize existingData as an empty object
            console.log("No existing JSON file, creating a new one.");
            existingData = {}; // Make sure existingData is initialized as an empty object
          }

          // Append new results to existing data
          Object.keys(categorizedClauses).forEach((key) => {
            if (Array.isArray(existingData[key])) {
              // If key already exists and is an array, append new data
              existingData[key].push(...categorizedClauses[key]);
            } else {
              // If key doesn't exist, create a new array with the new data
              existingData[key] = categorizedClauses[key];
            }
          });

          // Save updated results to JSON file
          await fs.writeFile(
            resultFilePath,
            JSON.stringify(existingData, null, 2)
          );
          console.log("Saved updated result to JSON file:", resultFileName);

          return { fileName: resultFileName, filePath: resultFilePath };
        } catch (error) {
          console.error(`Error processing ${fileName}:`, error);
          return {
            fileName: fileName,
            error: (error as Error).message || String(error),
          };
        }
      })
    );

    const successfulResults = results.filter((result) => !result.error);
    const errors = results.filter((result) => result.error);

    // Log success and errors
    console.log("Successful results count:", successfulResults.length);
    console.log("Errors count:", errors.length);

    // Check if no files were successfully processed
    if (successfulResults.length === 0) {
      throw new Error("No files were successfully processed.");
    }

    // Trigger final result processing (call processFinalResults)
    console.log("Triggering final result processing...");
    await processFinalResults(highItems, mediumItems, lowItems);
    console.log("Final results processing completed.");

    return NextResponse.json({ results: successfulResults, errors });
  } catch (error) {
    console.error("Processing error:", error);
    return NextResponse.json(
      {
        error: "Failed to process request.",
        details: (error as Error).message || String(error),
      },
      { status: 500 }
    );
  }
}
