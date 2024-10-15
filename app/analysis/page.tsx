"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// JSON 파일 형태의 결과 데이터 타입은 제거되었습니다.

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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 서버에서 JSON 데이터를 가져오는 함수
  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        const response = await fetch("/api/get-final-result"); // Fetch from the final_results.json
        if (!response.ok) {
          throw new Error("Failed to fetch analysis data");
        }
        const data = await response.json();
        setResult(data); // 서버에서 가져온 데이터로 상태를 설정
      } catch (error) {
        console.error("Error fetching analysis data:", error);
        setResult(null); // 데이터가 없을 때 null 설정
      } finally {
        setLoading(false); // 로딩 상태 완료
      }
    };

    fetchAnalysisData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl font-semibold text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl font-semibold text-red-600">
          Failed to load analysis result.
        </p>
      </div>
    );
  }

  // 각 섹션에 해당하는 데이터를 준비합니다.
  const sections: SectionData[] = [
    {
      title: "Critical Attention Required",
      description:
        "These clauses pose a high risk or significant disadvantage. Careful consideration and potential negotiation are strongly recommended.",
      items: result.high,
      bgColor: "bg-red-100",
      textColor: "text-red-800",
    },
    {
      title: "Moderate Attention Advised",
      description:
        "These clauses carry a moderate level of risk or complexity. Evaluate carefully to determine if they align with your needs and expectations.",
      items: result.medium,
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
    },
    {
      title: "Low Risk, High Protection",
      description:
        "These clauses are generally favorable and pose low risk. They offer good protection with minimal downsides.",
      items: result.low,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    },
  ];

  // PDF로 다운로드하는 함수
  const downloadPDF = () => {
    const doc = new jsPDF(); // 새로운 PDF 문서 생성

    doc.text("Contract Analysis Result", 10, 10); // 제목 추가

    // 각 섹션별로 테이블 생성
    sections.forEach((section, index) => {
      // 섹션의 제목과 설명 추가
      doc.text(section.title, 10, (index + 1) * 30);
      doc.text(section.description, 10, (index + 1) * 35);

      // 해당 섹션의 항목을 테이블로 추가
      autoTable(doc, {
        startY: (index + 1) * 40, // 각 섹션별로 간격을 조정
        head: [["Clauses"]],
        body: section.items.map((item) => [item]), // 각 항목을 테이블로 변환
      });
    });

    doc.save("analysis_result.pdf"); // PDF 파일 저장
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="mb-6 text-3xl font-bold text-center text-gray-800">
        Contract Analysis Result
      </h1>
      <div className="flex justify-end mb-4">
        {/* PDF 다운로드 버튼 */}
        <button
          onClick={downloadPDF}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Download PDF
        </button>
      </div>
      <div className="flex flex-col gap-6">
        {sections
          .sort((a, b) => {
            // Define the order type to allow string indexing
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
              className={`p-6 rounded-lg shadow-md ${section.bgColor} cursor-pointer transition-all duration-300 hover:shadow-lg`}
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

      {expandedSection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setExpandedSection(null)} // 바깥을 클릭하면 팝업이 닫히게 처리
        >
          <div
            className={`w-full max-w-2xl p-6 rounded-lg shadow-xl bg-white relative max-h-[80vh] overflow-y-auto ${
              sections.find((s) => s.title === expandedSection)?.bgColor
            }`}
            onClick={(e) => e.stopPropagation()} // 팝업 내용 클릭 시 닫히지 않도록 처리
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
