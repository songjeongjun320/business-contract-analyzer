import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import fs from "fs/promises";
import path from "path";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const DB_DIRECTORY = path.join(process.cwd(), "app/db");

export async function POST(request: Request) {
  console.log("POST request received");
  try {
    const splitDir = path.join(DB_DIRECTORY, "split_txt_here");
    console.log("Split directory set to:", splitDir);

    // Read the directory contents
    const files = await fs.readdir(splitDir);
    // console.log("Files in split directory:", files);

    // Filter out only text files
    const textFiles = files.filter((file) => file.endsWith(".txt"));
    // console.log("Text files found:", textFiles);

    // Process each text file
    const results = await Promise.all(
      textFiles.map(async (fileName) => {
        // console.log("Processing file:", fileName);
        const filePath = path.join(splitDir, fileName);
        const text = await fs.readFile(filePath, "utf-8");
        // console.log("File content length for", fileName, ":", text.length);

        try {
          //   console.log("Sending request to Groq API for file:", fileName);
          console.time(`Groq API request for ${fileName}`);
          const response = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content:
                  "You are an AI that categorizes contract clauses into four categories: low cost & high protection, high cost & high protection, low cost & low protection, and high cost & low protection. without any explanation just json format",
              },
              {
                role: "user",
                content: `Categorize the following text into four categories: "low cost & high protection", "high cost & high protection", "low cost & low protection", and "high cost & low protection". Respond only with a valid, complete JSON object exactly in the following format. Ensure the JSON object is properly closed with a curly brace and contains no additional explanation or text:\n
              {
                "low cost & high protection": [],
                "high cost & high protection": [],
                "low cost & low protection": [],
                "high cost & low protection": []
              }
              Categorize the text here:\n\n${text}`,
              },
            ],
            model: "llama3-8b-8192",
          });
          console.timeEnd(`Groq API request for ${fileName}`);
          //   console.log("Received response from Groq API for file:", fileName);

          let jsonContent =
            response.choices?.[0]?.message?.content?.trim() || "";
          if (!jsonContent.endsWith("}")) {
            jsonContent += "}";
          }

          let newCategories;
          try {
            newCategories = JSON.parse(jsonContent);
            console.log("Successfully parsed categories for file:", fileName);
          } catch (error) {
            console.error(
              `Error parsing Groq response for ${fileName}:`,
              error
            );
            newCategories = {
              "low cost & high protection": [],
              "high cost & high protection": [],
              "low cost & low protection": [],
              "high cost & low protection": [],
            };
          }

          // Save the result to a JSON file, appending to existing data if present
          const resultFileName = "all_results.json"; // Common filename to store all results
          const resultFilePath = path.join(splitDir, resultFileName);

          // Default structure for existing data
          let existingData: Record<string, string[]> = {
            "low cost & high protection": [],
            "high cost & high protection": [],
            "low cost & low protection": [],
            "high cost & low protection": [],
          };

          // Check if the file exists, if it does, read and parse the existing data
          try {
            const existingFileContent = await fs.readFile(
              resultFilePath,
              "utf-8"
            );
            existingData = JSON.parse(existingFileContent);
            console.log("Existing data loaded:", existingData);
          } catch (error) {
            console.log("No existing JSON file, creating a new one.");
          }

          // Merge new data with existing data
          (
            Object.keys(newCategories) as Array<keyof typeof existingData>
          ).forEach((categoryKey) => {
            // Ensure that the existing data is an array
            if (!Array.isArray(existingData[categoryKey])) {
              existingData[categoryKey] = [];
            }

            // Merge new clauses into the existing category array
            existingData[categoryKey] = [
              ...existingData[categoryKey],
              ...newCategories[categoryKey].filter(
                (clause: string) => !!clause
              ), // Ensure no empty strings are added
            ];
          });

          // Save the merged result to the JSON file
          await fs.writeFile(
            resultFilePath,
            JSON.stringify(existingData, null, 2)
          );
          console.log("Saved updated result to JSON file:", resultFileName);

          // Add the console message for stacking information
          console.log(`
======================
${fileName} result is stacked to ${resultFileName}
======================
`);

          // Return JSON file path as part of the response
          return { fileName: resultFileName, filePath: resultFilePath };
        } catch (error) {
          console.error(`Error processing ${fileName} with Groq:`, error);
          return {
            fileName: fileName,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    const successfulResults = results.filter((result) => !result.error);
    const errors = results.filter((result) => result.error);

    console.log("Successful results count:", successfulResults.length);
    console.log("Errors count:", errors.length);

    if (errors.length > 0) {
      console.error("Errors occurred during processing:", errors);
    }

    if (successfulResults.length === 0) {
      throw new Error("No pages were successfully processed");
    }

    // Send back successful result JSON paths
    return NextResponse.json({
      results: successfulResults,
      errors,
    });
  } catch (error) {
    console.error("Error processing with Groq:", error);
    return NextResponse.json(
      {
        error: "Failed to process with Groq",
        details: (error as Error).message || String(error),
      },
      { status: 500 }
    );
  }
}
