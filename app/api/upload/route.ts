import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Set the path to the 'db' directory
const DB_DIRECTORY = path.join(process.cwd(), "app/db");

// Function to handle POST request (file upload)
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File; // Cast the file as a File

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Get file array buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileName = `${Date.now()}-${file.name}`; // Now the .name property is accessible
  const filePath = path.join(DB_DIRECTORY, fileName);

  try {
    // Check if the 'db' folder exists, if not, create it
    await fs.mkdir(DB_DIRECTORY, { recursive: true });

    // Save the file to the 'db' directory
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      message: "File uploaded successfully",
      filePath,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
