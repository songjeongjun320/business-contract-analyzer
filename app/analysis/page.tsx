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
  const [isSummarized, setIsSummarized] = useState(false); // 요약된 데이터를 보는지 여부를 추적하는 상태

  // 데이터를 가져오는 함수
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

  // 초기 데이터 로드 (original - final_results.json)
  useEffect(() => {
    fetchAnalysisData("/result/final_results.json", (data) => {
      setResult(data);
      setOriginalData(data); // 원본 데이터 저장
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl font-semibold text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl font-semibold text-red-600">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl font-semibold text-red-600">
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

  // 요약된 데이터를 불러오거나 원래 데이터를 복원하는 함수
  const toggleSummarizedData = () => {
    setLoading(true);
    if (isSummarized) {
      // 요약 데이터를 본 후 원래 데이터로 돌아가는 경우
      setResult(originalData);
      setLoading(false); // 즉시 완료
    } else if (summarizedData) {
      // 요약된 데이터를 이미 불러온 경우
      setResult(summarizedData);
      setLoading(false); // 즉시 완료
    } else {
      // 요약된 데이터를 처음 불러오는 경우
      setTimeout(() => {
        fetchAnalysisData("/result/final_results_summary.json", (data) => {
          setSummarizedData(data);
          setResult(data);
          setLoading(false);
        });
      }, 5000); // 처음 요약된 데이터를 불러올 때 5초 대기
    }
    setIsSummarized(!isSummarized); // 요약/원본 상태 전환
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto">
        <h1 className="mb-8 text-4xl font-bold text-center text-gray-800">
          Contract Analysis Result
        </h1>
        <div className="flex justify-end gap-4 mb-6">
          <button
            onClick={downloadPDF}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition duration-300 ease-in-out"
          >
            Download PDF
          </button>
          <button
            onClick={toggleSummarizedData}
            className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 transition duration-300 ease-in-out"
          >
            {isSummarized ? "Original" : "Summarize"}
          </button>
        </div>
        {/* 세로로 배치되도록 */}
        <div className="flex flex-col gap-6">
          {sections
            .sort((a, b) => {
              const order: { [key: string]: number } = {
                "Critical Attention Required": 1,
                "Moderate Attention Advised": 2,
                "Low Risk, High Protection": 3,
              };
              return order[a.title] - order[b.title];
            })
            .map((section, index) => (
              <div
                key={index}
                className={`p-8 rounded-lg shadow-md ${section.bgColor} cursor-pointer transition-all duration-300 hover:shadow-lg`}
                onClick={() => setExpandedSection(section.title)}
              >
                <h2
                  className={`mb-3 text-xl font-semibold ${section.textColor}`}
                >
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
            style={{ maxHeight: "90vh" }} // 팝업 창의 최대 높이를 90vh로 설정하여 더 많은 공간을 차지하도록 수정합니다.
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
