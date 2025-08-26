"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiService } from "@/lib/api";
import { toast } from "sonner";

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const session_id = String(params?.session_id || "");

  const [detail, setDetail] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session_id) return;
      setIsLoading(true);
      const { data, error } = await apiService.getHistoryDetail(session_id);
      if (!cancelled) {
        if (error) {
          toast.error("Failed to load history detail");
        } else {
          setDetail((data as unknown as Record<string, any>) || null);
        }
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session_id]);

  const handleDelete = async () => {
    if (!session_id) return;
    if (!confirm("Delete this history item? This cannot be undone.")) return;
    setIsDeleting(true);
    const { error } = await apiService.deleteHistory(session_id);
    setIsDeleting(false);
    if (error) {
      toast.error("Failed to delete history item");
      return;
    }
    toast.success("History item deleted");
    router.push("/history");
  };

  const pct = (() => {
    try {
      const acc = (detail?.accuracy ?? 0) as number;
      const raw = acc > 1 ? acc / 100 : acc;
      return Number((raw * 100).toFixed(2));
    } catch {
      return 0;
    }
  })();

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">History Detail</h1>
          <p className="text-muted-foreground">Session: {session_id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/history")}>Back</Button>
          <Button variant="outline" onClick={() => router.push(`/tests/session/${session_id}/result`)}>View Result</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? "Deleting.." : "Delete"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{detail?.deck_title ?? "Session Summary"}</CardTitle>
          <CardDescription>Overview of this test session</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : !detail ? (
            <div className="text-sm text-muted-foreground">No detail found.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Accuracy</div>
                <Badge variant="secondary">{pct}%</Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Deck</div>
                  <div className="font-medium truncate">{detail?.deck_title ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Cards</div>
                  <div className="font-medium">{detail?.total_cards ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Correct</div>
                  <div className="font-medium">{detail?.correct_answers ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Completed At</div>
                  <div className="font-medium">{detail?.completed_at ? new Date(detail.completed_at).toLocaleString() : "-"}</div>
                </div>
              </div>

              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-2">Raw Data</div>
                <pre className="rounded bg-muted p-3 overflow-auto text-xs">
                  {JSON.stringify(detail, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
