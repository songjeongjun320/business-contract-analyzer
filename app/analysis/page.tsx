"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface AnalysisResult {
  lowCostHighProtection: string[];
  highCostHighProtection: string[];
  lowCostLowProtection: string[];
  highCostLowProtection: string[];
}

interface SectionData {
  title: string;
  description: string;
  items: string[];
  bgColor: string;
  textColor: string;
}

export default function AnalysisPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    const mockResult: AnalysisResult = {
      lowCostHighProtection: [
        "Condition 1",
        "Condition 2",
        "Additional favorable term 1",
        "Additional favorable term 2",
      ],
      highCostHighProtection: [
        "Condition 3",
        "Condition 4",
        "Extra protection clause 1",
        "Extra protection clause 2",
      ],
      lowCostLowProtection: [
        "Condition 5",
        "Condition 6",
        "Basic coverage term 1",
        "Basic coverage term 2",
      ],
      highCostLowProtection: [
        "Condition 7",
        "Condition 8",
        "Expensive clause 1",
        "Expensive clause 2",
      ],
    };
    setResult(mockResult);
  }, []);

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl font-semibold text-gray-600">Loading...</p>
      </div>
    );
  }

  const sections: SectionData[] = [
    {
      title: "Low Cost, High Protection",
      description:
        "These are favorable conditions that offer good protection at a low cost.",
      items: result.lowCostHighProtection,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    },
    {
      title: "High Cost, High Protection",
      description:
        "These conditions offer good protection but at a higher cost. Consider if the protection is worth the expense.",
      items: result.highCostHighProtection,
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
    },
    {
      title: "Low Cost, Low Protection",
      description:
        "These conditions are inexpensive but offer limited protection. Evaluate if the lack of protection is acceptable.",
      items: result.lowCostLowProtection,
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
    },
    {
      title: "High Cost, Low Protection",
      description:
        "These are unfavorable conditions with high cost and low protection. Consider negotiating or avoiding these terms.",
      items: result.highCostLowProtection,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className={`w-full max-w-2xl p-6 rounded-lg shadow-xl ${
              sections.find((s) => s.title === expandedSection)?.bgColor
            }`}
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
