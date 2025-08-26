"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiService, TestHistoryItem, TestHistoryResponse } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [items, setItems] = useState<TestHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const { data, error } = await apiService.getHistory({ page, size });
      if (!cancelled) {
        if (error) {
          toast.error("Failed to load history");
          setItems([]);
          setTotal(0);
        } else {
          const res = (data as unknown as TestHistoryResponse) || { items: [], total: 0 };
          setItems(res.items || []);
          setTotal(res.total || res.items?.length || 0);
        }
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, page, size]);

  const handleDelete = async (session_id: string) => {
    if (!confirm("Delete this history item? This cannot be undone.")) return;
    const { error } = await apiService.deleteHistory(session_id);
    if (error) {
      toast.error("Failed to delete history item");
      return;
    }
    toast.success("History item deleted");
    // Refetch current page
    try {
      setIsLoading(true);
      const { data } = await apiService.getHistory({ page, size });
      const res = (data as unknown as TestHistoryResponse) || { items: [], total: 0 };
      setItems(res.items || []);
      setTotal(res.total || res.items?.length || 0);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / size)), [total, size]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-muted-foreground">Your completed test sessions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>Dashboard</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>Newest first</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No history yet. Take a test to see it here.</div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => {
                const raw = it.accuracy ?? (it.total_cards ? it.correct_answers / it.total_cards : 0);
                const ratio = raw > 1 ? raw / 100 : raw;
                const pct = Number((ratio * 100).toFixed(2));
                return (
                  <div key={it.session_id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">{it.deck_title}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{pct}%</Badge>
                        <Badge variant={it.correct_answers > 0 ? "default" : "outline"}>
                          {it.correct_answers}/{it.total_cards}
                        </Badge>
                      </div>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex flex-wrap items-center justify-between text-sm text-muted-foreground gap-2">
                      <div>
                        {it.completed_at ? new Date(it.completed_at).toLocaleString() : "Completed"}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/history/${it.session_id}`)}>
                          Open
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => router.push(`/tests/session/${it.session_id}/result`)}>
                          View Result
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(it.session_id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
