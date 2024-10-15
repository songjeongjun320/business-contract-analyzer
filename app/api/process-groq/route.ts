import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import fs from "fs/promises";
import path from "path";
import { processFinalResults } from "./processFinalResults.ts";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Result directory
const RESULT_DIRECTORY = path.join(process.cwd(), "app/db/result");

// Send request to Groq API
async function sendGroqRequest(baseData: any, text: string) {
  return await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `Here is a JSON structure...`,
      },
      {
        role: "user",
        content: `Here is the text to analyze:\n\n${text}`,
      },
    ],
    model: "llama3-8b-8192",
  });
}

// Retry request logic
async function retryRequestIfNeeded(
  baseData: any,
  text: string,
  previousResponse: any
) {
  try {
    const jsonContent =
      previousResponse?.choices?.[0]?.message?.content?.trim() || "";
    JSON.parse(jsonContent);
    return previousResponse;
  } catch (error) {
    return await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Here is a JSON structure...`,
        },
        {
          role: "user",
          content: `Please make sure your response is valid JSON format:\n\n${text}`,
        },
      ],
      model: "llama3-8b-8192",
    });
  }
}

export async function POST(request: Request) {
  try {
    const splitDir = path.join(process.cwd(), "app/db/split_txt_here");
    const files = await fs.readdir(splitDir);
    const textFiles = files.filter((file) => file.endsWith(".txt"));

    const pythonApiUrl = "http://127.0.0.1:5000/process-toxicity";
    const pythonApiResponse = await fetch(pythonApiUrl);
    const toxicityResult = await pythonApiResponse.json();

    const allItemsList = toxicityResult.all_items;
    const highItems = toxicityResult.high_toxicity_items;
    const mediumItems = toxicityResult.medium_toxicity_items;
    const lowItems = toxicityResult.low_toxicity_items;

    let baseData: Record<string, string[]> = {};
    allItemsList.forEach((item: string) => {
      baseData[item] = [];
    });

    // Process each text file
    const results = await Promise.all(
      textFiles.map(async (fileName) => {
        const filePath = path.join(splitDir, fileName);
        const text = await fs.readFile(filePath, "utf-8");

        try {
          const initialResponse = await sendGroqRequest(baseData, text);
          const response = await retryRequestIfNeeded(
            baseData,
            text,
            initialResponse
          );

          let jsonContent =
            response?.choices?.[0]?.message?.content?.trim() || "";
          if (!jsonContent.endsWith("}")) jsonContent += "}";

          let categorizedClauses = JSON.parse(jsonContent);

          const resultFileName = "all_results.json";
          const resultFilePath = path.join(RESULT_DIRECTORY, resultFileName);

          let existingData: Record<string, string[]> = {
            high: [],
            medium: [],
            low: [],
          };
          try {
            const existingFileContent = await fs.readFile(
              resultFilePath,
              "utf-8"
            );
            existingData = JSON.parse(existingFileContent);
          } catch (error) {
            console.log("No existing JSON file, creating a new one.");
          }

          Object.keys(categorizedClauses).forEach((categoryKey) => {
            if (highItems.includes(categoryKey)) {
              existingData.high = [
                ...existingData.high,
                ...categorizedClauses[categoryKey],
              ];
            } else if (mediumItems.includes(categoryKey)) {
              existingData.medium = [
                ...existingData.medium,
                ...categorizedClauses[categoryKey],
              ];
            } else if (lowItems.includes(categoryKey)) {
              existingData.low = [
                ...existingData.low,
                ...categorizedClauses[categoryKey],
              ];
            }
          });

          await fs.writeFile(
            resultFilePath,
            JSON.stringify(existingData, null, 2)
          );
          return { fileName: resultFileName, filePath: resultFilePath };
        } catch (error) {
          return {
            fileName: fileName,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    const successfulResults = results.filter((result) => !result.error);
    if (successfulResults.length === 0)
      throw new Error("No files were successfully processed");

    // After processing all files, process final results
    await processFinalResults(); // Trigger the final processing

    return NextResponse.json({ results: successfulResults });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process", details: (error as Error).message },
      { status: 500 }
    );
  }
}
