"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    if (file && file.type === "application/pdf") {
      const formData = new FormData();
      formData.append("file", file);

      try {
        // 파일 업로드
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${await uploadResponse.text()}`);
        }

        const uploadResult = await uploadResponse.json();

        // 업로드한 파일을 기반으로 Groq API 호출
        const groqResponse = await fetch("/api/process-groq", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pages: uploadResult.results }),
        });

        if (!groqResponse.ok) {
          const errorData = await groqResponse.json();
          throw new Error(`Groq processing failed: ${errorData.error}`);
        }

        const groqResult = await groqResponse.json();

        // Groq 분석 결과에서 JSON 파일 경로 추출
        if (groqResult.results && groqResult.results.length > 0) {
          const jsonFilePath = groqResult.results[0].filePath; // JSON 파일 경로 추출
          // JSON 파일 경로를 분석 페이지로 전달
          router.push(`/analysis?jsonPath=${encodeURIComponent(jsonFilePath)}`);
        } else {
          throw new Error("No pages were successfully processed");
        }
      } catch (error) {
        console.error("Error:", error);
        alert(error instanceof Error ? error.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    } else {
      alert("Please upload a valid PDF file.");
      setIsLoading(false);
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
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Upload and Proceed"}
        </button>
      </form>
    </div>
  );
}
