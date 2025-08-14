'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Deck, apiService, Me, TestStats } from '@/lib/api';
import { DeckCard } from '@/components/decks/deck-card';
import { CreateDeckDialog } from '@/components/decks/create-deck-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, Heart, Star, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<TestStats | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    
    // fetch current user for ownership checks
    apiService.getMe().then(({ data }) => {
      if (data) setMe(data);
    }).catch(() => { /* ignore */ });

    fetchDecks();
    fetchStats();
  }, [isAuthenticated, router, searchTerm, visibilityFilter]);

  const fetchDecks = async () => {
    try {
      const { data, error } = await apiService.getDecks({
        search: searchTerm || undefined,
        visibility: visibilityFilter,
        page: 1,
        size: 20,
      });

      if (error) {
        toast.error('Failed to fetch decks');
        return;
      }

      if (data) {
        setDecks(data);
      }
    } catch (error) {
      toast.error('Failed to fetch decks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeckCreated = (newDeck: Deck) => {
    setDecks(prev => [newDeck, ...prev]);
  };

  const handleDeckUpdated = (updatedDeck: Deck) => {
    setDecks(prev => prev.map(deck => deck.id === updatedDeck.id ? updatedDeck : deck));
  };

  const handleDeckDeleted = (deckId: number) => {
    setDecks(prev => prev.filter(deck => deck.id !== deckId));
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await apiService.getTestStats();
      if (!error && data) {
        setStats(data);
      }
    } catch (_) {
      // ignore stats errors
    }
  };

  const favoriteDecks = decks.filter(deck => deck.favourite);
  const recentDecks = decks.slice(0, 6);
  const totalCards = decks.reduce((sum, deck) => sum + (deck.card_count || 0), 0);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Manage your flashcard decks and track your progress</p>
        </div>
        <CreateDeckDialog onDeckCreated={handleDeckCreated} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Decks</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{decks.length}</div>
            <p className="text-xs text-muted-foreground">
              {favoriteDecks.length} favorites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCards}</div>
            <p className="text-xs text-muted-foreground">
              Across all decks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favorites</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{favoriteDecks.length}</div>
            <p className="text-xs text-muted-foreground">
              Starred decks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search decks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={visibilityFilter} onValueChange={(value: 'all' | 'public' | 'private') => setVisibilityFilter(value)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Decks</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recent Decks */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : decks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">No Decks Yet</CardTitle>
            <CardDescription className="mb-6">
              Create your first flashcard deck to get started with learning
            </CardDescription>
            <CreateDeckDialog onDeckCreated={handleDeckCreated} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Recent Results */}
          {stats && stats.recent_tests && stats.recent_tests.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h2 className="text-xl font-semibold">Recent Results</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.recent_tests.slice(0, 6).map((t: any, idx: number) => (
                  <Card key={idx}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{t.deck_title || 'Deck'}</CardTitle>
                      <CardDescription>{new Date(t.completed_at || t.date || Date.now()).toLocaleString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Accuracy</div>
                        <div className="font-semibold">{Math.round((t.accuracy ?? t.score ?? 0) * 100) / 100}%</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {favoriteDecks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-yellow-500" />
                <h2 className="text-xl font-semibold">Favorite Decks</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteDecks.map((deck) => (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    canManage={me ? me.id === deck.owner_id : false}
                    onUpdate={handleDeckUpdated}
                    onDelete={handleDeckDeleted}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-4">All Decks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {decks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  canManage={me ? me.id === deck.owner_id : false}
                  onUpdate={handleDeckUpdated}
                  onDelete={handleDeckDeleted}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}