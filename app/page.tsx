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

  // Store the file and set the path
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

    // Set the file path to resultFilePath
    setResultFilePath(result.supabasePath);
    console.log("LOG-- After setResultFilePath: ", resultFilePath);
  };

  // Divide pdf files to individual pages and send them to AWS server
  const processPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const numPages = pdfDoc.getPages().length;
    let allResultsData: any[] = [];

    // Treat the pages individually
    for (let i = 0; i < numPages; i++) {
      const newPdfDoc = await PDFDocument.create();
      const [page] = await newPdfDoc.copyPages(pdfDoc, [i]);
      newPdfDoc.addPage(page);

      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });

      // Set the tmp file path
      const pageFileName = `page_${i + 1}.pdf`;
      const tempFilePath = `/tmp/${pageFileName}`; // ex) /tmp/pageFileName

      // Save the file to server or local
      console.log(`Saving page ${i + 1} as: ${tempFilePath}`);

      // Send a file to server
      const formData = new FormData();
      formData.append("file", blob, pageFileName);

      try {
        // Request to Flask
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

        const blobResponse = await response.blob();
        const pageResultData = await blobResponse.text();

        // Stack the result datas from the server, because system treat the pdf each pages separately
        allResultsData.push(pageResultData);
      } catch (error) {
        console.error(`Error processing page ${i + 1}:`, error);
      }
    }

    return allResultsData;
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

  const navigateToResultPage = () => {
    router.push(
      `/analysis?filePath=final_results_20250110_210422.json`
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 py-12 sm:py-16 lg:py-20">
      <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="absolute top-4 right-4">
            <button
              onClick={navigateToResultPage}
              className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium shadow-md hover:bg-gray-800 transition-all duration-200"
            >
              Sample Result Page
            </button>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            Contract Analyzer
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 font-medium">
            Upload your business contract, and we'll highlight the key clauses you should pay attention to.
          </p>
        </div>
  
        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-12">
          {/* File Upload Section */}
          <form
            onSubmit={handleSubmit}
            className="bg-white shadow-2xl rounded-lg p-10 flex-1 border border-gray-200"
          >
            <div className="mb-6">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-300"
              >
                <div className="flex flex-col items-center justify-center pt-4 pb-6">
                  <FileText className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="mb-2 text-base text-gray-500 font-medium">
                    <span className="font-semibold">Click to upload</span> or drag & drop your file
                  </p>
                  <p className="text-sm text-gray-400">PDF only (max. 10MB)</p>
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
              <p className="text-sm text-gray-500 mb-4">
                Selected file: <span className="font-medium">{file.name}</span>
              </p>
            )}
            {!isProcessingComplete ? (
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg text-lg font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Analyze Contract"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCheckResult}
                className="w-full bg-green-600 text-white px-6 py-4 rounded-lg text-lg font-semibold shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-all duration-300 flex items-center justify-center"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Check the Result
              </button>
            )}
          </form>
  
          {/* Project Overview Section */}
          <div className="bg-gray-50 shadow-lg rounded-lg p-10 flex-1 border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Project Overview</h2>
            <p className="text-gray-700 text-base leading-relaxed mb-4">
              💡 <strong>Business Contract Analyzer</strong> helps individuals and businesses identify vulnerabilities and key clauses in contracts. With advanced AI models, it empowers users to make better decisions without the need for costly legal fees.
            </p>
            <ul className="list-disc list-inside text-gray-700 text-base leading-relaxed mb-4">
              <li>PDF parsing and key clause extraction</li>
              <li>Secure and fast processing</li>
              <li>Actionable insights for better decision-making</li>
            </ul>
            <p className="text-gray-700 text-base leading-relaxed">
              🌟 Developed by industry experts, hosted on reliable AWS infrastructure, this tool aims to redefine how contracts are reviewed, offering unmatched speed and precision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
  
}
