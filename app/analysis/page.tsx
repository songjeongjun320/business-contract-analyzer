"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SectionData {
  title: string;
  description: string;
  items: string[];
  bgColor: string;
  textColor: string;
}

export default function AnalysisPage() {
  const [result, setResult] = useState<{
    high: string[];
    medium: string[];
    low: string[];
  } | null>(null);
  const [originalData, setOriginalData] = useState<{
    high: string[];
    medium: string[];
    low: string[];
  } | null>(null);
  const [summarizedData, setSummarizedData] = useState<{
    high: string[];
    medium: string[];
    low: string[];
  } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSummarized, setIsSummarized] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // 다크 모드 상태 추가

  const fetchAnalysisData = async (
    url: string,
    setData: (data: any) => void
  ) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch analysis data");
      }
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error("Error fetching analysis data:", error);
      setError("Failed to load analysis result.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysisData("/result/final_results.json", (data) => {
      setResult(data);
      setOriginalData(data);
    });
  }, []);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${
          darkMode ? "bg-gray-900" : "bg-gray-100"
        }`}
      >
        <p
          className={`text-xl font-semibold ${
            darkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Loading...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${
          darkMode ? "bg-gray-900" : "bg-gray-100"
        }`}
      >
        <p
          className={`text-xl font-semibold ${
            darkMode ? "text-red-400" : "text-red-600"
          }`}
        >
          {error}
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${
          darkMode ? "bg-gray-900" : "bg-gray-100"
        }`}
      >
        <p
          className={`text-xl font-semibold ${
            darkMode ? "text-red-400" : "text-red-600"
          }`}
        >
          No results available.
        </p>
      </div>
    );
  }

  const sections: SectionData[] = [
    {
      title: "Critical Risk",
      description:
        "These clauses pose a high risk or significant disadvantage. Careful consideration and potential negotiation are strongly recommended.",
      items: result.high,
      bgColor: darkMode ? "bg-red-800" : "bg-red-100",
      textColor: darkMode ? "text-red-200" : "text-red-800",
    },
    {
      title: "Moderate Risk",
      description:
        "These clauses carry a moderate level of risk or complexity. Evaluate carefully to determine if they align with your needs and expectations.",
      items: result.medium,
      bgColor: darkMode ? "bg-yellow-800" : "bg-yellow-100",
      textColor: darkMode ? "text-yellow-200" : "text-yellow-800",
    },
    {
      title: "Low Risk",
      description:
        "These clauses are generally favorable and pose low risk. They offer good protection with minimal downsides.",
      items: result.low,
      bgColor: darkMode ? "bg-green-800" : "bg-green-100",
      textColor: darkMode ? "text-green-200" : "text-green-800",
    },
  ];

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Contract Analysis Result", 10, 10);
    sections.forEach((section, index) => {
      doc.text(section.title, 10, (index + 1) * 30);
      doc.text(section.description, 10, (index + 1) * 35);
      autoTable(doc, {
        startY: (index + 1) * 40,
        head: [["Clauses"]],
        body: section.items.map((item) => [item]),
      });
    });
    doc.save("analysis_result.pdf");
  };

  const toggleSummarizedData = () => {
    setLoading(true);
    if (isSummarized) {
      setResult(originalData);
      setLoading(false);
    } else if (summarizedData) {
      setResult(summarizedData);
      setLoading(false);
    } else {
      setTimeout(() => {
        fetchAnalysisData("/result/final_results_summary.json", (data) => {
          setSummarizedData(data);
          setResult(data);
          setLoading(false);
        });
      }, 5000);
    }
    setIsSummarized(!isSummarized);
  };

  return (
    <div
      className={`min-h-screen p-8 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      <div className="max-w-5xl mx-auto">
        <h1
          className={`mb-8 text-4xl font-bold text-center ${
            darkMode ? "text-gray-300" : "text-gray-800"
          }`}
        >
          Contract Analysis Result
        </h1>
        <div className="flex justify-between mb-6">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-4 py-2 text-white rounded-md ${
              darkMode ? "bg-gray-700" : "bg-gray-500"
            }`}
          >
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <div className="flex justify-end gap-4">
            <button
              onClick={downloadPDF}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition duration-300 ease-in-out"
            >
              Download PDF
            </button>
            <button
              onClick={toggleSummarizedData}
              className={`px-4 py-2 text-white rounded-md transition duration-300 ease-in-out ${
                isSummarized
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-green-600 hover:bg-purple-600"
              }`}
            >
              {isSummarized ? "Original" : "Summarize"}
            </button>
          </div>
        </div>

        {/* 카드 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {sections.map((section, index) => (
            <div
              key={index}
              className={`p-6 rounded-lg shadow-lg ${section.bgColor} cursor-pointer transition-transform transform hover:scale-105`}
              onClick={() => setExpandedSection(section.title)}
            >
              <h2 className={`mb-3 text-xl font-semibold ${section.textColor}`}>
                {section.title}
              </h2>
              <p
                className={`mb-4 text-sm ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {section.description}
              </p>
              <ul className="space-y-2">
                {section.items.slice(0, 3).map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start">
                    <span className={`mr-2 text-lg ${section.textColor}`}>
                      •
                    </span>
                    <span
                      className={`text-gray-700 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              {section.items.length > 3 && (
                <p
                  className={`mt-2 text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Click to see more...
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {expandedSection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setExpandedSection(null)}
        >
          <div
            className={`w-full max-w-2xl p-6 rounded-lg shadow-xl bg-white relative overflow-y-auto ${
              sections.find((s) => s.title === expandedSection)?.bgColor
            }`}
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2
                className={`text-2xl font-bold ${
                  sections.find((s) => s.title === expandedSection)?.textColor
                }`}
              >
                {sections.find((s) => s.title === expandedSection)?.title}
              </h2>
              <button
                onClick={() => setExpandedSection(null)}
                className={`${
                  sections.find((s) => s.title === expandedSection)?.textColor
                } hover:opacity-75`}
              >
                <X size={24} />
              </button>
            </div>
            <p
              className={`mb-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
            >
              {sections.find((s) => s.title === expandedSection)?.description}
            </p>
            <ul className="space-y-2">
              {sections
                .find((s) => s.title === expandedSection)
                ?.items.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span
                      className={`mr-2 text-lg ${
                        sections.find((s) => s.title === expandedSection)
                          ?.textColor
                      }`}
                    >
                      •
                    </span>
                    <span
                      className={`text-gray-700 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {item}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
