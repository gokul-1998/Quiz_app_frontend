"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TestSessionResult {
  session_id: string;
  deck_title: string;
  deck_owner?: string;
  total_cards: number;
  correct_answers: number;
  accuracy: number; // 0..1 or percentage depending on backend; we'll show both nicely
  total_time?: number | null;
  completed_at: string;
  answers?: Array<{
    card_id: number;
    user_answer: string;
    is_correct?: boolean;
  }>;
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<TestSessionResult | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("latest_test_result");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setResult(parsed);
    } catch {
      // ignore
    }
  }, []);

  const goToTest = () => router.push("/test");
  const goToDashboard = () => router.push("/dashboard");

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md border rounded-lg p-6 bg-white shadow-sm text-center">
          <h1 className="text-xl font-semibold mb-2">No Results Found</h1>
          <p className="text-sm text-gray-600 mb-4">Start a test to see your results here.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={goToTest} className="px-4 py-2 rounded bg-blue-600 text-white">Start Test</button>
            <button onClick={goToDashboard} className="px-4 py-2 rounded border">Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const percent = result.accuracy > 1 ? Math.round(result.accuracy) : Math.round(result.accuracy * 100);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl border rounded-lg p-6 bg-white shadow-sm">
        <h1 className="text-2xl font-bold mb-1">Test Results</h1>
        <p className="text-sm text-gray-600 mb-4">{result.deck_title}</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-gray-600">Score</div>
            <div className="text-2xl font-semibold">{result.correct_answers} / {result.total_cards}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-gray-600">Accuracy</div>
            <div className="text-2xl font-semibold">{percent}%</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-gray-600">Completed at</div>
            <div className="text-lg">{new Date(result.completed_at).toLocaleString()}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-gray-600">Time Taken</div>
            <div className="text-lg">{result.total_time ? `${result.total_time}s` : "Not tracked"}</div>
          </div>
        </div>

        {result.answers && result.answers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Your Answers</h2>
            <div className="space-y-2 max-h-64 overflow-auto pr-2">
              {result.answers.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between border rounded p-2 text-sm">
                  <div>Your Result</div>
                  <div className="truncate max-w-[60%]">Answer: {a.user_answer}</div>
                  {typeof a.is_correct === 'boolean' && (
                    <span className={`px-2 py-0.5 rounded text-white ${a.is_correct ? 'bg-green-600' : 'bg-red-600'}`}>
                      {a.is_correct ? 'Correct' : 'Wrong'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={goToTest} className="px-4 py-2 rounded border">Retake Test</button>
          <button onClick={goToDashboard} className="px-4 py-2 rounded bg-black text-white">Go to Dashboard</button>
        </div>
      </div>
    </div>
  );
}
