import fs from "fs/promises";
import path from "path";

const RESULT_DIRECTORY = path.join(process.cwd(), "app/db/result");

export async function processFinalResults() {
  try {
    const allResultsFilePath = path.join(RESULT_DIRECTORY, "all_results.json");
    const finalResultsFilePath = path.join(
      RESULT_DIRECTORY,
      "final_results.json"
    );

    const allResultsContent = await fs.readFile(allResultsFilePath, "utf-8");
    const allResults = JSON.parse(allResultsContent);

    const finalResults: Record<string, string[]> = {
      high: [],
      medium: [],
      low: [],
    };

    Object.entries(allResults).forEach(([key, value]) => {
      // Assert that value is an array of strings
      const valuesArray = value as string[];
      if (key === "high") {
        finalResults.high.push(...valuesArray);
      } else if (key === "medium") {
        finalResults.medium.push(...valuesArray);
      } else if (key === "low") {
        finalResults.low.push(...valuesArray);
      }
    });

    await fs.writeFile(
      finalResultsFilePath,
      JSON.stringify(finalResults, null, 2)
    );
    console.log("final_results.json created successfully");
  } catch (error) {
    console.error("Error processing final results:", error);
  }
}
