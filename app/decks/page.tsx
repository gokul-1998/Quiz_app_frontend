"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiService, Deck } from "@/lib/api";
import { AuthGate } from "@/components/auth/auth-gate";
import { DeckCard } from "@/components/decks/deck-card";
import { CreateDeckDialog } from "@/components/decks/create-deck-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

export default function DecksPage() {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDecks();
  }, [isAuthenticated]);

  const fetchDecks = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiService.getMyDecks();
      if (data) setDecks(data);
    } finally {
      setIsLoading(false);
    }
  };


  const shownDecks = useMemo(() => {
    // Only my decks (already filtered by API /decks/my)
    let base = decks;
    // Apply visibility tab within my decks
    if (visibilityFilter === 'public') base = base.filter(d => d.visibility === 'public');
    if (visibilityFilter === 'private') base = base.filter(d => d.visibility === 'private');
    // Apply search on owned subset
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      base = base.filter(
        (d) => d.title.toLowerCase().includes(term) || (d.description || "").toLowerCase().includes(term)
      );
    }
    // Favorites first, then by like_count descending
    return [...base].sort((a, b) => {
      const favA = a.favourite ? 1 : 0;
      const favB = b.favourite ? 1 : 0;
      if (favA !== favB) return favB - favA;
      const la = a.like_count ?? 0;
      const lb = b.like_count ?? 0;
      return lb - la;
    });
  }, [decks, searchTerm, visibilityFilter]);

  const isOwner = (_d: Deck) => true;

  const handleCreated = (deck: Deck) => {
    setDecks((prev) => [deck, ...prev]);
  };

  const handleUpdated = (deck: Deck) => {
    setDecks((prev) => prev.map((d) => (d.id === deck.id ? deck : d)));
  };

  const handleDeleted = (deckId: number) => {
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
  };

  return (
    <AuthGate>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold">Decks</h1>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search decks..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") fetchDecks();
                }}
              />
            </div>
            <Button variant="secondary" onClick={() => fetchDecks()}>Refresh</Button>
            <CreateDeckDialog onDeckCreated={handleCreated} />
          </div>
        </div>

        <Tabs value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
          </TabsList>
          <TabsContent value="all" />
          <TabsContent value="public" />
          <TabsContent value="private" />
        </Tabs>

        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
              <CardDescription>Fetching decks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Please wait</div>
            </CardContent>
          </Card>
        ) : shownDecks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No decks found</CardTitle>
              <CardDescription>Create your first deck or adjust filters</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateDeckDialog onDeckCreated={handleCreated} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shownDecks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                canManage={isOwner(deck)}
                onDelete={handleDeleted}
                onUpdate={handleUpdated}
              />
            ))}
          </div>
        )}
      </div>
    </AuthGate>
  );
}
