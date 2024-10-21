"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { uploadFile } from "@/actions/storageActions";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null); // 결과 상태 추가
  const [error, setError] = useState<string | null>(null); // 에러 상태 추가
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null); // 결과 초기화

    if (file && file.type === "application/pdf") {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadFile(formData); // uploadFile의 결과를 result에 할당
      setResult(result); // 결과 상태 업데이트
      console.log("Result: ", result); // 추가된 로그

      // Flask 서버에 신호 보내기
      if (result && result.path) {
        try {
          const response = await fetch(
            "http://your-flask-server-url/api/process-pdf",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ path: result.path }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to send signal to Flask server");
          }

          const responseData = await response.json();
          console.log("Flask response:", responseData);
        } catch (error) {
          console.error("Error sending signal to Flask server:", error);
          setError("Error processing the PDF on the server.");
        }
      }
    } else {
      alert("Please upload a valid PDF file.");
      setIsLoading(false);
    }
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
        </form>
        {/* 에러 메시지 표시 섹션 추가 */}
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-6"
            role="alert"
          >
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        {result && (
          <div className="bg-white shadow-lg rounded-xl p-8 mt-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Processing Result
            </h2>
            <p className="mb-4 text-gray-700">File uploaded: {result.path}</p>
            <p className="mb-4 text-gray-700">File ID: {result.id}</p>
            <p className="mb-4 text-gray-700">Full Path: {result.fullPath}</p>
          </div>
        )}
      </div>
    </div>
  );
}
