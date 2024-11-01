"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, CheckCircle } from "lucide-react";

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
      setIsProcessingComplete(false); // 새로운 파일을 선택하면 처리 완료 상태를 초기화
      setError(null); // 에러 메시지 초기화
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

    try {
      // console.log(
      //   "Flask server URL:",
      //   process.env.NEXT_PUBLIC_FLASK_SERVER_URL
      // );
      console.log("Local server URL:", process.env.NEXT_PUBLIC_LOCAL);

      const response = await fetch(
        // `${process.env.NEXT_PUBLIC_FLASK_SERVER_URL!}/process`, // NEXT_PUBLIC_LOCAL
        `${process.env.NEXT_PUBLIC_LOCAL!}/process`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send PDF to Flask server");
      }

      // 받아온 final_results.json 파일 처리
      const blob = await response.blob();
      const finalResultsData = await blob.text(); // 텍스트로 변환

      // 저장 경로 설정
      const savePath = "/app/db/result/final_results.json";
      await saveFileWithUniqueName(savePath, finalResultsData); // 고유 이름 설정 함수 호출

      setIsProcessingComplete(true);
    } catch (error) {
      console.error("Error processing the PDF:", error);
      setError("Error processing the PDF on the server.");
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
