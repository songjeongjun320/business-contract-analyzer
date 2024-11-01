"use client";

// Without GROQ

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

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
      try {
        setTimeout(() => {
          const jsonFilePath = "/app/result/final_results.json";
          router.push(`/analysis?jsonPath=${encodeURIComponent(jsonFilePath)}`);
        }, 5000);
      } catch (error) {
        console.error("Error:", error);
        alert(error instanceof Error ? error.message : "An error occurred");
      }
    } else {
      alert("Please upload a valid PDF file.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 sm:py-16 lg:py-20">
      <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-4">
            Business Contract Analyzer
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Upload your business contract and we'll highlight the key clauses
            you should pay attention to.
          </p>
        </div>

        {/* Grid layout for PDF upload and How It Works */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* PDF Upload Section */}
          <form
            onSubmit={handleSubmit}
            className="bg-white shadow-xl rounded-lg p-8"
          >
            <div className="mb-6">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-72 border-3 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition duration-300 ease-in-out"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileText className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="mb-2 text-lg text-gray-500">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
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
              className="w-full bg-purple-600 text-white px-6 py-4 rounded-xl text-lg font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition duration-300 ease-in-out flex items-center justify-center"
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

          {/* How It Works Section */}
          <div className="bg-white shadow-lg rounded-xl p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              How It Works
            </h2>
            <div className="space-y-6">
              <div className="flex items-start">
                <AlertTriangle className="w-8 h-8 text-yellow-500 mr-4 flex-shrink-0" />
                <p className="text-lg text-gray-600">
                  Our AI analyzes your business contract to identify potentially
                  problematic clauses or terms that require careful review.
                </p>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-8 h-8 text-green-500 mr-4 flex-shrink-0" />
                <p className="text-lg text-gray-600">
                  We highlight key areas of concern, helping you focus on the
                  most critical parts of the agreement.
                </p>
              </div>
              <div className="flex items-start">
                <Clock className="w-8 h-8 text-blue-500 mr-4 flex-shrink-0" />
                <p className="text-lg text-gray-600">
                  Save time and reduce risk by quickly identifying clauses that
                  may need negotiation or legal review.
                </p>
              </div>
            </div>
            <div className="mt-8 text-base text-gray-500">
              <p>
                Our goal is to empower you with insights into your business
                contracts, helping you make informed decisions and protect your
                interests. While our analysis is thorough, we always recommend
                consulting with a legal professional for final review and
                advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
