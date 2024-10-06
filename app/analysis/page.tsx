"use client";

import { useState, useEffect } from "react";

interface AnalysisResult {
  lowCostHighProtection: string[];
  highCostHighProtection: string[];
  lowCostLowProtection: string[];
  highCostLowProtection: string[];
}

export default function AnalysisPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    // In a real application, you would fetch the analysis result from your API here
    // For this example, we'll use mock data
    const mockResult: AnalysisResult = {
      lowCostHighProtection: ["Condition 1", "Condition 2"],
      highCostHighProtection: ["Condition 3", "Condition 4"],
      lowCostLowProtection: ["Condition 5", "Condition 6"],
      highCostLowProtection: ["Condition 7", "Condition 8"],
    };
    setResult(mockResult);
  }, []);

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="mb-6 text-2xl font-bold text-center">
        Contract Analysis Result
      </h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-green-100 rounded-lg">
          <h2 className="mb-2 text-lg font-semibold">
            Low Cost, High Protection
          </h2>
          <p className="mb-2 text-sm text-gray-600">
            These are favorable conditions that offer good protection at a low
            cost.
          </p>
          <ul className="list-disc list-inside">
            {result.lowCostHighProtection.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="p-4 bg-yellow-100 rounded-lg">
          <h2 className="mb-2 text-lg font-semibold">
            High Cost, High Protection
          </h2>
          <p className="mb-2 text-sm text-gray-600">
            These conditions offer good protection but at a higher cost.
            Consider if the protection is worth the expense.
          </p>
          <ul className="list-disc list-inside">
            {result.highCostHighProtection.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="p-4 bg-blue-100 rounded-lg">
          <h2 className="mb-2 text-lg font-semibold">
            Low Cost, Low Protection
          </h2>
          <p className="mb-2 text-sm text-gray-600">
            These conditions are inexpensive but offer limited protection.
            Evaluate if the lack of protection is acceptable.
          </p>
          <ul className="list-disc list-inside">
            {result.lowCostLowProtection.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="p-4 bg-red-100 rounded-lg">
          <h2 className="mb-2 text-lg font-semibold">
            High Cost, Low Protection
          </h2>
          <p className="mb-2 text-sm text-gray-600">
            These are unfavorable conditions with high cost and low protection.
            Consider negotiating or avoiding these terms.
          </p>
          <ul className="list-disc list-inside">
            {result.highCostLowProtection.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
