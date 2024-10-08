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
    // Filter out only text files
    const textFiles = files.filter((file) => file.endsWith(".txt"));

    // Process each text file
    const results = await Promise.all(
      textFiles.map(async (fileName) => {
        const filePath = path.join(splitDir, fileName);
        const text = await fs.readFile(filePath, "utf-8");

        try {
          console.time(`Groq API request for ${fileName}`);
          const response = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: `Categorize contract clauses into the following categories based on cost and protection level:
                  
                  - low cost & high protection
                  - high cost & high protection
                  - low cost & low protection
                  - high cost & low protection
                  
                  Your response must only be in the following JSON format without any extra explanation:
                  
                  {
                    "low cost & high protection": [],
                    "high cost & high protection": [],
                    "low cost & low protection": [],
                    "high cost & low protection": []
                  }
                  
                  Ignore irrelevant clauses.`,
              },
              {
                role: "user",
                content: `Here is the text to categorize:\n\n${text}`,
              },
            ],
            model: "llama3-8b-8192",
          });
          console.timeEnd(`Groq API request for ${fileName}`);
          console.log("Received response from Groq API for file:", fileName);

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

          const resultFileName = "all_results.json";
          const resultFilePath = path.join(splitDir, resultFileName);

          let existingData: Record<string, string[]> = {
            "low cost & high protection": [],
            "high cost & high protection": [],
            "low cost & low protection": [],
            "high cost & low protection": [],
          };

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

          (
            Object.keys(newCategories) as Array<keyof typeof existingData>
          ).forEach((categoryKey) => {
            if (!Array.isArray(existingData[categoryKey])) {
              existingData[categoryKey] = [];
            }

            existingData[categoryKey] = [
              ...existingData[categoryKey],
              ...newCategories[categoryKey].filter(
                (clause: string) => !!clause
              ),
            ];
          });

          // Save the merged result to the JSON file
          try {
            await fs.writeFile(
              resultFilePath,
              JSON.stringify(existingData, null, 2)
            );
            console.log("Saved updated result to JSON file:", resultFileName);
          } catch (writeError) {
            console.error(
              `Error saving updated result for ${fileName}:`,
              writeError
            );
          }

          console.log(`
======================
${fileName} result is stacked to ${resultFileName}
======================
`);

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
