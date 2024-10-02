"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (file && file.type === "application/pdf") {
      const formData = new FormData();
      formData.append("file", file); // Append the file to the formData

      try {
        // Make a POST request to the /api/upload API route
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          console.log("File uploaded successfully:", result.filePath);
          router.push("/grid");
        } else {
          console.error("Error uploading file:", result.error);
          alert("File upload failed: " + result.error);
        }
      } catch (error) {
        console.error("Upload error:", error);
        alert("An error occurred while uploading the file");
      }
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center space-y-4"
      >
        <h1 className="text-2xl font-bold">Upload a PDF</h1>
        <input type="file" accept=".pdf" onChange={handleFileChange} />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Upload and Proceed
        </button>
      </form>
    </div>
  );
}
