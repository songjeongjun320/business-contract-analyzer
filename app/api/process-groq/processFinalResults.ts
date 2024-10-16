import fs from "fs/promises";
import path from "path";

// Define the result directory path
const RESULT_DIRECTORY = path.join(process.cwd(), "app/db/result");

export async function processFinalResults(
  highItems: string[],
  mediumItems: string[],
  lowItems: string[]
) {
  try {
    // Define paths for all_results.json and final_results.json
    const allResultsFilePath = path.join(RESULT_DIRECTORY, "all_results.json");
    const finalResultsFilePath = path.join(
      RESULT_DIRECTORY,
      "final_results.json"
    );

    // Read the all_results.json file
    const allResultsContent = await fs.readFile(allResultsFilePath, "utf-8");
    const allResults = JSON.parse(allResultsContent) || {}; // Parse the content or use an empty object if file is empty

    // Initialize structure to hold categorized results
    const finalResults: Record<string, string[]> = {
      high: [], // High-risk clauses
      medium: [], // Medium-risk clauses
      low: [], // Low-risk clauses
    };

    // Categorize data from all_results.json into high, medium, and low based on provided keys
    Object.entries(allResults).forEach(([key, value]) => {
      const valuesArray = Array.isArray(value) ? (value as string[]) : []; // Ensure the value is an array

      // Check which category the key belongs to and add it to the appropriate list
      if (highItems.includes(key)) {
        finalResults.high.push(...valuesArray);
      } else if (mediumItems.includes(key)) {
        finalResults.medium.push(...valuesArray);
      } else if (lowItems.includes(key)) {
        finalResults.low.push(...valuesArray);
      }
    });

    // Write the final categorized results into final_results.json
    await fs.writeFile(
      finalResultsFilePath,
      JSON.stringify(finalResults, null, 2) // Format the output with indentation
    );
    console.log("final_results.json has been successfully created!");
  } catch (error) {
    // Log an error if something goes wrong during the process
    console.error("Error during final results processing:", error);
  }
}
