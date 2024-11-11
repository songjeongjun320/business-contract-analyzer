"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, CheckCircle } from "lucide-react";
import { PDFDocument } from "pdf-lib"; // pdf-lib 추가

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [result, setResult] = useState<any>(null);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file || file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setIsProcessingComplete(false);

    const formData = new FormData();
    formData.append("file", file);

    const controller = new AbortController();
    // const timeoutId = setTimeout(() => controller.abort(), 600000); // 10분 타임아웃

    try {
      console.log(
        "Flask server URL:",
        process.env.NEXT_PUBLIC_FLASK_REDIRECT_URL
      );

      // PDF 페이지 분리하여 서버에 보내기
      const pdfResultData = await processPDF(file);
      console.log("Final accumulated results:", pdfResultData);

      // 최종 결과 JSON 파일 저장
      const savePath = "/tmp/final_results.json";
      await saveFileWithUniqueName(savePath, pdfResultData);

      setIsProcessingComplete(true);
    } catch (error) {
      console.error("Error processing the PDF:", error);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.error("Request timed out after 10 minutes");
          alert("Request timed out after 10 minutes. Please try again.");
        } else {
          throw error;
        }
      } else {
        console.error("An unknown error occurred:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 중복 방지 파일 저장 함수
  let result_file_path = "";
  const saveFileWithUniqueName = async (basePath: string, data: any) => {
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

    // JSON 응답에서 파일 경로와 메시지를 추출
    const result = await response.json();

    // 필요에 따라 경로를 사용할 수 있음
    result_file_path = result.filePath;
  };

  // PDF 파일을 페이지별로 분리하고 각 페이지를 서버에 전송하는 함수
  const processPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const numPages = pdfDoc.getPages().length;
    let allResultsData: any[] = [];

    // 각 페이지를 개별적으로 처리
    for (let i = 0; i < numPages; i++) {
      const newPdfDoc = await PDFDocument.create();
      const [page] = await newPdfDoc.copyPages(pdfDoc, [i]);
      newPdfDoc.addPage(page);

      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });

      // 페이지별로 임시 저장 경로 설정
      const pageFileName = `page_${i + 1}.pdf`;
      const tempFilePath = `/tmp/${pageFileName}`; // 예시로 /tmp 폴더에 저장 경로

      // 파일을 서버 또는 로컬에 저장하는 코드 추가 (예: 임시 디렉터리)
      console.log(`Saving page ${i + 1} as: ${tempFilePath}`);

      // 서버에 파일을 전송
      const formData = new FormData();
      formData.append("file", blob, pageFileName);

      try {
        // Flask 서버에 각 페이지를 요청
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

        // 서버에서 받은 결과를 기존 데이터에 누적
        allResultsData.push(pageResultData);
      } catch (error) {
        console.error(`Error processing page ${i + 1}:`, error);
      }
    }

    return allResultsData;
  };

  const handleCheckResult = () => {
    router.push("/analysis");
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
          {/* 버튼 렌더링 로직 변경 */}
          {!isProcessingComplete ? (
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-300 ease-in-out flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Analyze Contract
                </>
              )}
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
        {/* 에러 메시지 표시 섹션 */}
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
