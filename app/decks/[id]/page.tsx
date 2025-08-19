'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Deck, Card as CardType, apiService, Me } from '@/lib/api';
import { CardPreview } from '@/components/cards/card-preview';
import { CreateCardDialog } from '@/components/cards/create-card-dialog';
import { AIGenerateDialog } from '@/components/cards/ai-generate-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BookOpen, Heart, Star, Calendar, Eye, Plus, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const deckId = parseInt(params.id as string);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    
    if (deckId) {
      fetchDeck();
      fetchCards();
      fetchMe();
    }
  }, [isAuthenticated, router, deckId]);

  const fetchDeck = async () => {
    try {
      const { data, error } = await apiService.getDeck(deckId);

      if (error) {
        toast.error('Failed to fetch deck');
        router.push('/dashboard');
        return;
      }

      if (data) {
        setDeck(data);
      }
    } catch (error) {
      toast.error('Failed to fetch deck');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // Modal state for time settings
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [perCardSeconds, setPerCardSeconds] = useState<string>('20'); // default 20s, editable
  const [totalTimeSeconds, setTotalTimeSeconds] = useState<string>(''); // optional

  const confirmStartTest = async () => {
    if (!deck) return;
    try {
      // Validate per-question
      if (perCardSeconds.trim() === '') {
        toast.error('Enter per-question time');
        return;
      }
      const perNum = Number(perCardSeconds);
      if (!Number.isFinite(perNum) || perNum <= 0) {
        toast.error('Per-question time must be a positive number');
        return;
      }
      if (perNum < 3) {
        toast.error('Per-question time must be at least 3 seconds');
        return;
      }

      // Validate optional total time
      let total: number | undefined = undefined;
      if (totalTimeSeconds.trim() !== '') {
        const totalNum = Number(totalTimeSeconds);
        if (!Number.isFinite(totalNum) || totalNum <= 0) {
          toast.error('Total time must be a positive number');
          return;
        }
        total = totalNum;
      }

      const per = perNum;
      const { data, error } = await apiService.startTestSession({ deck_id: deck.id, per_card_seconds: per, total_time_seconds: total });
      if (error) {
        const err = error.toLowerCase();
        if (err.includes('403') || err.includes('forbidden')) {
          toast.error('You are not allowed to start a test for this private deck.');
        } else {
          toast.error(error);
        }
        return;
      }
      toast.success('Test started');
      setIsTimeDialogOpen(false);
      if (data && (data as any).session_id) {
        router.push(`/tests/session/${(data as any).session_id}?deckId=${deck.id}&perCard=${per}`);
      }
    } catch (e) {
      toast.error('Failed to start test');
    }
  };

  const isOwner = useMemo(() => {
    if (!deck || !me) return false;
    return deck.owner_id === me.id;
  }, [deck, me]);

  const fetchMe = async () => {
    try {
      const { data } = await apiService.getMe();
      if (data) setMe(data);
    } catch (error) {
      // noop; auth gate and request() handle auth; me is optional for viewing public decks
    }
  };

  const fetchCards = async () => {
    try {
      const { data, error } = await apiService.getCards(deckId);

      if (error) {
        toast.error('Failed to fetch cards');
        return;
      }

      if (data) {
        setCards(data);
      }
    } catch (error) {
      toast.error('Failed to fetch cards');
    } finally {
      setIsLoadingCards(false);
    }
  };

  const handleCardCreated = (newCard: CardType) => {
    setCards((prev: CardType[]) => [...prev, newCard]);
    if (deck) {
      setDeck((prev: Deck | null) => prev ? { ...prev, card_count: (prev.card_count || 0) + 1 } : prev);
    }
  };

  const handleLike = async () => {
    if (!deck) return;

    try {
      if (deck.liked) {
        await apiService.unlikeDeck(deck.id);
        toast.success('Deck unliked');
      } else {
        await apiService.likeDeck(deck.id);
        toast.success('Deck liked');
      }
      
      setDeck((prev: Deck | null) => prev ? {
        ...prev,
        liked: !prev.liked,
        like_count: prev.liked ? prev.like_count - 1 : prev.like_count + 1,
      } : prev);
    } catch (error) {
      toast.error('Failed to update like status');
    }
  };

  const handleFavorite = async () => {
    if (!deck) return;

    try {
      if (deck.favourite) {
        await apiService.unfavoriteDeck(deck.id);
        toast.success('Removed from favorites');
      } else {
        await apiService.favoriteDeck(deck.id);
        toast.success('Added to favorites');
      }
      
      setDeck((prev: Deck | null) => prev ? {
        ...prev,
        favourite: !prev.favourite,
      } : prev);
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const parseTags = (tags?: string) => {
    if (!tags) return [];
    return tags.split(',').map(tag => tag.trim()).filter(Boolean);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-muted rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-muted rounded w-3/4 mb-8"></div>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Deck not found</h1>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button variant="ghost" className="mb-6" onClick={() => router.push('/dashboard')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      {/* Deck Header */}
      <div className="bg-card rounded-lg border p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{deck.title}</h1>
            {deck.description && (
              <p className="text-muted-foreground mb-4">{deck.description}</p>
            )}
            
            <div className="flex flex-wrap gap-2 mb-4">
              {parseTags(deck.tags).map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{cards.length} cards</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Created {formatDate(deck.created_at)}</span>
              </div>
              <Badge variant={deck.visibility === 'public' ? 'default' : 'outline'}>
                {deck.visibility}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleLike}>
              <Heart className={`mr-2 h-4 w-4 ${deck.liked ? 'fill-current text-red-500' : ''}`} />
              {deck.like_count}
            </Button>
            <Button variant="outline" onClick={handleFavorite}>
              <Star className={`h-4 w-4 ${deck.favourite ? 'fill-current text-yellow-500' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {(deck.visibility === 'public' || isOwner) && (
          <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default">
                <Play className="mr-2 h-4 w-4" /> Start Test
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Test Time Settings</DialogTitle>
                <DialogDescription>
                  Configure the per-question time and optional total time limit.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="perCard" className="text-right">Per-question (s)</Label>
                  <Input
                    id="perCard"
                    type="number"
                    min={1}
                    className="col-span-3"
                    value={perCardSeconds}
                    onChange={(e) => setPerCardSeconds(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="totalTime" className="text-right">Total time (s)</Label>
                  <Input
                    id="totalTime"
                    type="number"
                    placeholder="Optional"
                    min={1}
                    className="col-span-3"
                    value={totalTimeSeconds}
                    onChange={(e) => setTotalTimeSeconds(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setIsTimeDialogOpen(false)}>Cancel</Button>
                <Button onClick={confirmStartTest}>Start</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {isOwner && (
          <>
            <CreateCardDialog deckId={deckId} onCardCreated={handleCardCreated} />
            <AIGenerateDialog deckId={deckId} onCardCreated={handleCardCreated} />
          </>
        )}
      </div>

      {/* Cards */}
      <div>
        <h2 className="text-2xl font-semibold mb-6">Cards ({cards.length})</h2>
        
        {isLoadingCards ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
                  <div className="h-4 bg-muted rounded w-full mb-2"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">No Cards Yet</CardTitle>
              <CardDescription className="mb-6">
                Add your first flashcard to start building this deck
              </CardDescription>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <CreateCardDialog deckId={deckId} onCardCreated={handleCardCreated} />
                <AIGenerateDialog deckId={deckId} onCardCreated={handleCardCreated} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card: CardType, index: number) => (
              <div key={card.id}>
                <CardPreview card={card} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}