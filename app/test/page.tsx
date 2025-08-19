"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthHeaders() {
  if (typeof window === "undefined") return {} as Record<string, string>;
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function TestPage() {
  const router = useRouter();
  const [deckId, setDeckId] = useState("");
  const [testStarted, setTestStarted] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [answers, setAnswers] = useState<{ card_id: number; user_answer: string }[]>([]);
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startTest = async () => {
    setLoading(true);
    setError("");
    setHint("");
    try {
      const res = await fetch(`${API_BASE_URL}/tests/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ deck_id: Number(deckId) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const qs = data.questions || [];
      setQuestions(qs);
      setTestStarted(true);
      setCurrent(0);
      setUserAnswer("");
      setAnswers([]);
    } catch (e: any) {
      setError(e.message || "Failed to start test");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!questions[current]) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/tests/submit-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          card_id: questions[current].id,
          user_answer: userAnswer,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const nextAnswers = [...answers, { card_id: questions[current].id, user_answer: userAnswer }];
      setAnswers(nextAnswers);
      setUserAnswer("");
      setHint("");
      if (current + 1 < questions.length) {
        setCurrent(current + 1);
      } else {
        await completeTest(nextAnswers);
      }
    } catch (e: any) {
      setError(e.message || "Failed to submit answer");
    } finally {
      setLoading(false);
    }
  };

  const getHint = async () => {
    if (!questions[current]) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/ai/gemini-hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          question: questions[current].question,
          qtype: questions[current].qtype,
          options: questions[current].options || [],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setHint(data.hint || "No hint available.");
    } catch (e: any) {
      setError(e.message || "Failed to get hint");
    } finally {
      setLoading(false);
    }
  };

  const completeTest = async (allAnswers: { card_id: number; user_answer: string }[]) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/tests/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(allAnswers),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // Persist result for results page and navigate
      if (typeof window !== "undefined") {
        localStorage.setItem("latest_test_result", JSON.stringify(data));
      }
      router.push("/results");
    } catch (e: any) {
      setError(e.message || "Failed to complete test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 min-h-screen flex flex-col justify-center items-center bg-white">
      <h1 className="text-2xl font-bold mb-4">Start a Test</h1>
      {!testStarted && (
        <div className="w-full flex flex-col gap-2 mb-6">
          <label htmlFor="deck-id">Deck ID</label>
          <input
            id="deck-id"
            type="number"
            className="border rounded px-3 py-2"
            value={deckId}
            onChange={(e) => setDeckId(e.target.value)}
            placeholder="Enter Deck ID"
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
            onClick={startTest}
            disabled={loading || !deckId}
          >
            {loading ? "Starting..." : "Start Test"}
          </button>
        </div>
      )}

      {testStarted && questions.length > 0 && (
        <div className="w-full">
          <div className="mb-4">
            <div className="font-semibold mb-2">Question {current + 1} of {questions.length}</div>
            <div className="mb-2">{questions[current].question}</div>
            {questions[current].qtype === "mcq" ? (
              <div className="flex flex-col gap-2 mb-2">
                {questions[current].options.map((opt: string, idx: number) => (
                  <label key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mcq"
                      value={opt}
                      checked={userAnswer === opt}
                      onChange={() => setUserAnswer(opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <input
                type="text"
                className="border rounded px-3 py-2 mb-2 w-full"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer"
              />
            )}
            <div className="flex gap-2">
              <button
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={submitAnswer}
                disabled={loading || !userAnswer}
              >
                Submit Answer
              </button>
              <button
                className="bg-gray-300 px-4 py-2 rounded"
                onClick={getHint}
                disabled={loading}
                type="button"
              >
                Get Hint (Gemini AI)
              </button>
            </div>
            {hint && <div className="mt-2 text-blue-700">Hint: {hint}</div>}
          </div>
        </div>
      )}

      {error && <div className="text-red-600 mt-2">{error}</div>}

      <div className="w-full border-t mt-8 pt-4 text-xs text-gray-500">
        <div>API Links:</div>
        <ul className="list-disc ml-4">
          <li><a href="/docs#/tests/start_post" target="_blank" rel="noopener noreferrer">POST /tests/start</a></li>
          <li><a href="/docs#/tests/submit-answer_post" target="_blank" rel="noopener noreferrer">POST /tests/submit-answer</a></li>
          <li><a href="/docs#/ai/gemini-hint_post" target="_blank" rel="noopener noreferrer">POST /ai/gemini-hint</a></li>
          <li><a href="/docs#/tests/complete_post" target="_blank" rel="noopener noreferrer">POST /tests/complete</a></li>
        </ul>
      </div>
    </div>
  );
}
