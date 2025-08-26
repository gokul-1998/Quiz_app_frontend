"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { apiService, TestSessionResult } from "@/lib/api";

export default function TestResultPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.session_id as string;

  const [result, setResult] = useState<TestSessionResult | null>(null);

  useEffect(() => {
    // Prefer localStorage (saved at completion). If absent, fetch from backend.
    try {
      const raw = localStorage.getItem("latest_test_result");
      if (raw) {
        const parsed = JSON.parse(raw) as TestSessionResult;
        if (parsed && parsed.session_id === sessionId) {
          setResult(parsed);
          return;
        }
      }
    } catch {}
    (async () => {
      const { data } = await apiService.getTestResult(sessionId);
      if (data) setResult(data);
    })();
  }, [sessionId]);

  const accuracyPct = useMemo(() => {
    if (!result) return 0;
    // Backends may return accuracy as a ratio (0-1) or already as percent (0-100)
    const raw = result.accuracy ?? (result.total_cards ? (result.correct_answers / result.total_cards) : 0);
    const ratio = raw > 1 ? raw / 100 : raw;
    return Number((ratio * 100).toFixed(2));
  }, [result]);

  if (!result) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Test Completed</CardTitle>
            <CardDescription>We couldn&apos;t find a saved result for this session. It may have been cleared.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Try completing a test again, or go back to your dashboard.</p>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => router.push("/history")}>View History</Button>
              <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-muted-foreground">Deck: {result.deck_title}</p>
        </div>
        <Badge variant="secondary">Session {result.session_id.slice(0, 8)}…</Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Completed at {new Date(result.completed_at).toLocaleString()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded border">
              <div className="text-sm text-muted-foreground">Total Questions</div>
              <div className="text-xl font-semibold">{result.total_cards}</div>
            </div>
            <div className="p-3 rounded border">
              <div className="text-sm text-muted-foreground">Correct</div>
              <div className="text-xl font-semibold text-green-600">{result.correct_answers}</div>
            </div>
            <div className="p-3 rounded border">
              <div className="text-sm text-muted-foreground">Accuracy</div>
              <div className="text-xl font-semibold">{accuracyPct}%</div>
            </div>
            <div className="p-3 rounded border">
              <div className="text-sm text-muted-foreground">Total Time</div>
              <div className="text-xl font-semibold">{result.total_time ?? "—"}s</div>
            </div>
          </div>
          <div>
            <Progress value={accuracyPct} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Answers</CardTitle>
          <CardDescription>Your responses for this session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.answers.map((a, idx) => (
              <div key={idx} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Your Result</div>
                  <Badge variant={a.is_correct ? "default" : "destructive"}>
                    {a.is_correct ? "Correct" : "Incorrect"}
                  </Badge>
                </div>
                <Separator className="my-2" />
                <div className="text-sm">
                  <div className="mb-1">
                    <span className="font-medium">Your Answer: </span>
                    <span className="whitespace-pre-wrap break-words">{a.user_answer}</span>
                  </div>
                  {typeof a.time_taken === "number" && (
                    <div className="text-muted-foreground">Time: {a.time_taken}s</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
