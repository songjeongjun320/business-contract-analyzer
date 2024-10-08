"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

// JSON 파일 형태의 결과 데이터 타입
interface AnalysisResult {
  "low cost & high protection": string[];
  "high cost & high protection": string[];
  "low cost & low protection": string[];
  "high cost & low protection": string[];
}

interface SectionData {
  title: string;
  description: string;
  items: string[];
  bgColor: string;
  textColor: string;
}

export default function AnalysisPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null); // 서버에서 데이터를 받아올 변수
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Loading 상태 관리

  // 서버에서 JSON 데이터를 가져오는 함수
  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        const response = await fetch("/api/get-analysis-result");
        if (!response.ok) {
          throw new Error("Failed to fetch analysis data");
        }
        const data: AnalysisResult = await response.json();
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
      title: "Low Cost, High Protection",
      description:
        "These are favorable conditions that offer good protection at a low cost.",
      items: result["low cost & high protection"],
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    },
    {
      title: "High Cost, High Protection",
      description:
        "These conditions offer good protection but at a higher cost. Consider if the protection is worth the expense.",
      items: result["high cost & high protection"],
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
    },
    {
      title: "Low Cost, Low Protection",
      description:
        "These conditions are inexpensive but offer limited protection. Evaluate if the lack of protection is acceptable.",
      items: result["low cost & low protection"],
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
    },
    {
      title: "High Cost, Low Protection",
      description:
        "These are unfavorable conditions with high cost and low protection. Consider negotiating or avoiding these terms.",
      items: result["high cost & low protection"],
      bgColor: "bg-red-100",
      textColor: "text-red-800",
    },
  ];

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="mb-6 text-3xl font-bold text-center text-gray-800">
        Contract Analysis Result
      </h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {sections.map((section, index) => (
          <div
            key={index}
            className={`p-6 rounded-lg shadow-md ${section.bgColor} cursor-pointer transition-all duration-300 hover:shadow-lg`}
            onClick={() => setExpandedSection(section.title)}
          >
            <h2 className={`mb-3 text-xl font-semibold ${section.textColor}`}>
              {section.title}
            </h2>
            <p className="mb-2 text-sm text-gray-600">{section.description}</p>
            <ul className="space-y-2">
              {section.items.slice(0, 2).map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start">
                  <span className={`mr-2 text-lg ${section.textColor}`}>•</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
            {section.items.length > 2 && (
              <p className="mt-2 text-sm text-gray-500">Click to see more...</p>
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
