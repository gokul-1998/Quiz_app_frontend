"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiService, Deck, Me } from "@/lib/api";
import { AuthGate } from "@/components/auth/auth-gate";
import { DeckCard } from "@/components/decks/deck-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

export default function StarredPage() {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    if (!isAuthenticated) return;

    apiService.getMe().then(({ data }) => { if (data) setMe(data); }).catch(() => {});
    fetchDecks();
  }, [isAuthenticated]);

  const fetchDecks = async () => {
    setIsLoading(true);
    try {
      // Fetch all visibility and filter client-side for favourites
      const { data, error } = await apiService.getDecks({ visibility: 'all' });
      if (!error && data) {
        setDecks(data.filter(d => d.favourite === true));
      }
    } catch (_) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const shownDecks = useMemo(() => {
    let base = decks;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      base = base.filter(
        (d) => d.title.toLowerCase().includes(term) || (d.description || "").toLowerCase().includes(term)
      );
    }
    // Within favourites, sort by like_count desc
    return [...base].sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0));
  }, [decks, searchTerm]);

  const isOwner = (d: Deck) => (me ? d.owner_id === me.id : false);

  return (
    <AuthGate>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold">Starred Decks</h1>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search starred decks..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") fetchDecks();
                }}
              />
            </div>
            <Button variant="secondary" onClick={() => fetchDecks()}>Refresh</Button>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
              <CardDescription>Fetching starred decks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Please wait</div>
            </CardContent>
          </Card>
        ) : shownDecks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No starred decks</CardTitle>
              <CardDescription>Star some decks to see them here</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shownDecks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                canManage={isOwner(deck)}
                onUpdate={(updated) => setDecks(prev => prev.map(d => d.id === updated.id ? updated : d))}
                onDelete={(id) => setDecks(prev => prev.filter(d => d.id !== id))}
              />
            ))}
          </div>
        )}
      </div>
    </AuthGate>
  );
}
