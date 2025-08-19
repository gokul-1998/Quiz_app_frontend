"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiService, Deck, Me } from "@/lib/api";
import { AuthGate } from "@/components/auth/auth-gate";
import { DeckCard } from "@/components/decks/deck-card";
import { CreateDeckDialog } from "@/components/decks/create-deck-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search } from "lucide-react";

export default function MyDecksPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "favorites" | "public" | "private">("all");

  useEffect(() => {
    if (!isAuthenticated) return;

    // Load current user
    apiService
      .getMe()
      .then(({ data }) => {
        if (data) setMe(data);
      })
      .catch(() => {});

    fetchDecks();
  }, [isAuthenticated]);

  const fetchDecks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await apiService.getDecks({ search: searchTerm || undefined });
      if (!error && data) {
        setDecks(data);
      }
    } catch (_) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const myDecks = useMemo(() => {
    const base = me ? decks.filter((d) => (d as any).owner_id === me.id || (d as any).owner?.id === me.id) : [];
    const filtered = base.filter((d) => {
      if (visibilityFilter === "favorites") return d.favourite === true;
      if (visibilityFilter === "public") return d.is_public === true;
      if (visibilityFilter === "private") return d.is_public === false;
      return true;
    });
    if (!searchTerm) return filtered;
    const term = searchTerm.toLowerCase();
    return filtered.filter((d) => d.title.toLowerCase().includes(term) || (d.description || "").toLowerCase().includes(term));
  }, [decks, me, visibilityFilter, searchTerm]);

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
          <h1 className="text-2xl font-semibold">My Decks</h1>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search my decks..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") fetchDecks();
                }}
              />
            </div>
            <Button variant="secondary" onClick={() => fetchDecks()}>Refresh</Button>
            <CreateDeckDialog onCreated={handleCreated}>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Deck
              </Button>
            </CreateDeckDialog>
          </div>
        </div>

        <Tabs value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
              <CardDescription>Fetching your decks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Please wait</div>
            </CardContent>
          </Card>
        ) : myDecks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No decks yet</CardTitle>
              <CardDescription>Create your first deck to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateDeckDialog onCreated={handleCreated}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Create Deck
                </Button>
              </CreateDeckDialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {myDecks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                canManage={true}
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
