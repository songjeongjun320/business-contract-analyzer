import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  try {
    // Prepare the form data to send to the Flask API
    const uploadData = new FormData();
    uploadData.append("file", file);

    // Make a POST request to the Flask API to process the PDF
    const flaskResponse = await fetch("http://127.0.0.1:5000/process-pdf", {
      method: "POST",
      body: uploadData,
    });

    // Handle the Flask API response
    if (!flaskResponse.ok) {
      throw new Error(`Flask API error: ${flaskResponse.statusText}`);
    }

    const result = await flaskResponse.json();

    // Return the result from the Flask API to the Next.js client
    return NextResponse.json({
      message: result.message,
      results: result.results,
    });
  } catch (error) {
    console.error("Error processing file through Flask:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
