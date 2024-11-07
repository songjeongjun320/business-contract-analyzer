"use client";

import { X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useState, useEffect } from "react";

interface SectionData {
  title: string;
  description: string;
  items: string[];
  bgColor: string;
  textColor: string;
}

// 데이터를 클라이언트에서 가져오는 함수
async function fetchClientData() {
  const res = await fetch("/api/get-final-result");

  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  return res.json();
}

// Client Component로 데이터 fetching 처리
export default function AnalysisPage() {
  const [result, setResult] = useState<{
    high: string[];
    medium: string[];
    low: string[];
  } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 클라이언트에서 데이터를 가져오기
    fetchClientData()
      .then(setResult)
      .catch(() => setError("Failed to load data"));
  }, []);

  if (error) {
    return <div>{error}</div>;
  }

  if (!result) {
    return <div>Loading...</div>;
  }

  const sections: SectionData[] = [
    {
      title: "High Risk",
      description:
        "These clauses pose a high risk or significant disadvantage. Careful consideration and potential negotiation are strongly recommended.",
      items: result.high,
      bgColor: "bg-red-100",
      textColor: "text-red-800",
    },
    {
      title: "Moderate Risk",
      description:
        "These clauses carry a moderate level of risk or complexity. Evaluate carefully to determine if they align with your needs and expectations.",
      items: result.medium,
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
    },
    {
      title: "Low Risk",
      description:
        "These clauses are generally favorable and pose low risk. They offer good protection with minimal downsides.",
      items: result.low,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
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

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto">
        <h1 className="mb-8 text-4xl font-bold text-center text-gray-800">
          Contract Analysis Result
        </h1>
        <div className="flex justify-end mb-6">
          <button
            onClick={downloadPDF}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition duration-300 ease-in-out"
          >
            Download PDF
          </button>
        </div>
        <div className="flex flex-col gap-6">
          {sections.map((section, index) => (
            <div
              key={index}
              className={`p-8 rounded-lg shadow-md ${section.bgColor} cursor-pointer transition-all duration-300 hover:shadow-lg`}
              onClick={() => setExpandedSection(section.title)}
            >
              <h2 className={`mb-3 text-xl font-semibold ${section.textColor}`}>
                {section.title}
              </h2>
              <p className="mb-2 text-sm text-gray-600">
                {section.description}
              </p>
              <ul className="space-y-2">
                {section.items.slice(0, 2).map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start">
                    <span className={`mr-2 text-lg ${section.textColor}`}>
                      •
                    </span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              {section.items.length > 2 && (
                <p className="mt-2 text-sm text-gray-500">
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
            <p className="mb-4 text-gray-700">
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
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
