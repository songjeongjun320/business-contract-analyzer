"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, CheckCircle } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import path from "path";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [resultFilePath, setResultFilePath] = useState<string>(""); // State로 관리
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setIsProcessingComplete(false);
      setError(null);
      console.log("File selected:", event.target.files[0].name);
    }
  };

  useEffect(() => {
    if (resultFilePath) {
      console.log("LOG-- resultFilePath updated to: ", resultFilePath);
    }
  }, [resultFilePath]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file || file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsProcessingComplete(false);

    try {
      const pdfResultData = await processPDF(file);
      console.log("Final accumulated results:", pdfResultData);

      const savePath =
        process.env.NODE_ENV === "production"
          ? "/tmp"
          : path.join(process.cwd(), "/db");
      await saveFileWithUniqueName(savePath, pdfResultData);
      setIsProcessingComplete(true);
    } catch (error) {
      console.error("Error processing the PDF:", error);
      alert("An error occurred while processing the PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 파일을 저장하고 경로를 설정하는 함수
  const saveFileWithUniqueName = async (basePath: string, data: any) => {
    console.log("Saving file with unique name...");
    const response = await fetch("/api/saveFileWithUniqueName", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ basePath, data }),
    });

    if (!response.ok) {
      throw new Error("Failed to save file with unique name");
    }

    const result = await response.json();
    console.log(
      "Response from saveFileWithUniqueName API:",
      result.supabasePath
    );

    // resultFilePath에 파일 경로를 설정
    setResultFilePath(result.supabasePath);
    console.log("LOG-- After setResultFilePath: ", resultFilePath);
  };

  // PDF 파일을 페이지별로 분리하고 각 페이지를 서버에 전송하는 함수
  const processPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const numPages = pdfDoc.getPages().length;

    const allResultsData = await Promise.all(
      Array.from({ length: numPages }).map(async (_, i) => {
        const newPdfDoc = await PDFDocument.create();
        const [page] = await newPdfDoc.copyPages(pdfDoc, [i]);
        newPdfDoc.addPage(page);

        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });

        const pageFileName = `page_${i + 1}.pdf`;
        const formData = new FormData();
        formData.append("file", blob, pageFileName);

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_FLASK_REDIRECT_URL!}/process`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to process page ${i + 1}`);
          }

          const pageResultData = await response.text();
          return pageResultData;
        } catch (error) {
          console.error(`Error processing page ${i + 1}:`, error);
          return null;
        }
      })
    );

    return allResultsData.filter(Boolean); // null 값을 제거하고 반환
  };

  const handleCheckResult = () => {
    if (!resultFilePath) {
      console.error("resultFilePath is empty. Cannot navigate.");
      alert("No result file path available. Please retry the analysis.");
      return;
    }
    console.log("Navigating to analysis with filePath:", resultFilePath);
    router.push(`/analysis?filePath=${encodeURIComponent(resultFilePath)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 sm:py-16 lg:py-20">
      <div className="w-full max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-4">
            Contract Analyzer
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Upload your business contract and we'll highlight the key clauses
            you should pay attention to.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-xl rounded-lg p-8 mb-8"
        >
          <div className="mb-6">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-72 border-3 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition duration-300 ease-in-out"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileText className="w-16 h-16 text-gray-400 mb-4" />
                <p className="mb-2 text-lg text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-sm text-gray-500">PDF (MAX. 10MB)</p>
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
          {file && (
            <p className="text-sm text-gray-600 mb-4">
              Selected file: {file.name}
            </p>
          )}
          {!isProcessingComplete ? (
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-300 ease-in-out flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Analyze Contract"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheckResult}
              className="w-full bg-green-600 text-white px-6 py-4 rounded-xl text-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-300 ease-in-out flex items-center justify-center"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Check the Result
            </button>
          )}
        </form>
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-6"
            role="alert"
          >
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
