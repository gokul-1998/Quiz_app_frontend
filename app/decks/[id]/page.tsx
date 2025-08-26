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
import { ArrowLeft, BookOpen, Heart, Star, Calendar, Eye, Plus, Play, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [myDeckIds, setMyDeckIds] = useState<Set<number>>(new Set());
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
      fetchMyDecks();
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

  const fetchMyDecks = async () => {
    try {
      const { data } = await apiService.getMyDecks();
      if (data && Array.isArray(data)) {
        setMyDeckIds(new Set(data.map((d) => d.id)));
      }
    } catch (_) {
      // ignore; ownership can still be derived from me/visibility
    }
  };
  

  // Edit/Delete Deck state
  const [isEditDeckOpen, setIsEditDeckOpen] = useState(false);
  const [editDeckTitle, setEditDeckTitle] = useState('');
  const [editDeckDescription, setEditDeckDescription] = useState('');
  const [isSavingDeck, setIsSavingDeck] = useState(false);
  const [isDeletingDeck, setIsDeletingDeck] = useState(false);

  useEffect(() => {
    if (deck) {
      setEditDeckTitle(deck.title || '');
      setEditDeckDescription(deck.description || '');
    }
  }, [deck]);

  const handleSaveDeck = async () => {
    if (!deck) return;
    const title = editDeckTitle.trim();
    if (!title) {
      toast.error('Title is required');
      return;
    }
    setIsSavingDeck(true);
    try {
      const { data, error } = await apiService.updateDeck(deck.id, {
        title,
        description: editDeckDescription,
      });
      if (error) {
        toast.error('Failed to update deck');
        return;
      }
      if (data) {
        setDeck((prev) => (prev ? { ...prev, ...data } : prev));
        toast.success('Deck updated');
        setIsEditDeckOpen(false);
      }
    } catch (_) {
      toast.error('Failed to update deck');
    } finally {
      setIsSavingDeck(false);
    }
  };

  const handleDeleteDeck = async () => {
    if (!deck) return;
    if (!confirm('Delete this deck? This cannot be undone.')) return;
    setIsDeletingDeck(true);
    try {
      const { error } = await apiService.deleteDeck(deck.id);
      if (error) {
        toast.error('Failed to delete deck');
        return;
      }
      toast.success('Deck deleted');
      // Notify other pages
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('deck:deleted', { detail: { deckId: deck.id } }));
        }
      } catch (_e) {}
      router.push('/decks');
    } catch (_) {
      toast.error('Failed to delete deck');
    } finally {
      setIsDeletingDeck(false);
    }
  };

  // Card edit/delete state
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<number | null>(null);

  const openEditCard = (card: CardType) => {
    setEditingCard(card);
    setEditQuestion(card.question || '');
    setEditAnswer(card.answer || '');
    setEditOptions(card.options ? [...card.options] : []);
  };

  const closeEditCard = () => {
    setEditingCard(null);
    setIsSavingCard(false);
  };

  const handleSaveCard = async () => {
    if (!deck || !editingCard) return;
    if (!editQuestion.trim()) {
      toast.error('Question is required');
      return;
    }
    if (!editAnswer.trim()) {
      toast.error('Answer is required');
      return;
    }
    if (editingCard.qtype === 'mcq') {
      const opts = (editOptions || []).map(o => o.trim()).filter(Boolean);
      if (opts.length < 2) {
        toast.error('MCQ must have at least 2 options');
        return;
      }
      if (!opts.includes(editAnswer.trim())) {
        toast.error('Answer must be one of the options');
        return;
      }
    }

    setIsSavingCard(true);
    try {
      const payload: Partial<CardType> = {
        question: editQuestion,
        answer: editAnswer,
        ...(editingCard.qtype === 'mcq' ? { options: editOptions } : {}),
      } as any;
      const { data, error } = await apiService.updateCard(deck.id, editingCard.id, payload);
      if (error) {
        toast.error('Failed to update card');
        return;
      }
      if (data) {
        setCards(prev => prev.map(c => (c.id === editingCard.id ? { ...c, ...data } : c)));
        toast.success('Card updated');
        closeEditCard();
      }
    } catch (_) {
      toast.error('Failed to update card');
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    if (!deck) return;
    setDeletingCardId(cardId);
    try {
      const { error } = await apiService.deleteCard(deck.id, cardId);
      if (error) {
        toast.error('Failed to delete card');
        return;
      }
      setCards(prev => prev.filter(c => c.id !== cardId));
      setDeck((prev: Deck | null) => prev ? { ...prev, card_count: Math.max((prev.card_count || 1) - 1, 0) } : prev);
      toast.success('Card deleted');
    } catch (_) {
      toast.error('Failed to delete card');
    } finally {
      setDeletingCardId(null);
    }
  };

  // Modal state for time settings
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [perCardSeconds, setPerCardSeconds] = useState<string>('20'); // default 20s, editable
  const [totalTimeSeconds, setTotalTimeSeconds] = useState<string>(''); // optional
  const [selectedQtype, setSelectedQtype] = useState<'all' | 'mcq' | 'fillups' | 'match'>('all');

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
        const qParam = selectedQtype !== 'all' ? `&qtype=${selectedQtype}` : '';
        router.push(`/tests/session/${(data as any).session_id}?deckId=${deck.id}&perCard=${per}${qParam}`);
      }
    } catch (e) {
      toast.error('Failed to start test');
    }
  };

  const isOwner = useMemo(() => {
    if (!deck) return false;
    // Primary: match owner_id with /auth/me
    if (me && deck.owner_id === me.id) return true;
    // Secondary: present in /decks/my list
    if (myDeckIds.has(deck.id)) return true;
    // Fallback: private decks are only visible to owner in this app
    return deck.visibility === 'private';
  }, [deck, me, myDeckIds]);

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
      // Refetch to ensure persisted server state
      await fetchDeck();
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

      // Notify other pages
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('deck:favourite-changed', {
            detail: { deckId: deck.id, favourite: !deck.favourite },
          }));
        }
      } catch (_e) {}
      // Refetch to ensure persisted server state
      await fetchDeck();
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

  const renderContent = () => {
    if (!deck) return null;
    if (deck.visibility === 'private' && !isOwner) {
      return (
        <Card className="text-center py-12">
          <CardContent>
            <CardTitle className="text-xl mb-2">Private Deck</CardTitle>
            <CardDescription>
              Cards are only visible to the deck owner.
            </CardDescription>
          </CardContent>
        </Card>
      );
    }
    if (isLoadingCards) {
      return (
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
      );
    }
    if (cards.length === 0) {
      return (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">No Cards Yet</CardTitle>
            <CardDescription className="mb-6">
              Add your first flashcard to start building this deck
            </CardDescription>
            <div className="text-sm text-muted-foreground">Use the buttons in the top-right to add cards.</div>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card: CardType) => (
          <div key={card.id} className="space-y-3">
            <CardPreview card={card} />
            {isOwner && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEditCard(card)}>Edit</Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletingCardId === card.id}
                  onClick={() => handleDeleteCard(card.id)}
                >
                  {deletingCardId === card.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
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
  const PageContent = () => {
    if (!deck) return null;
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
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleLike}>
                <Heart className={`mr-2 h-4 w-4 ${deck.liked ? 'fill-current text-red-500' : ''}`} />
                {deck.like_count}
              </Button>
              <Button variant="outline" onClick={handleFavorite}>
                <Star className={`h-4 w-4 ${deck.favourite ? 'fill-current text-yellow-500' : ''}`} />
              </Button>
            </div>
            <div className="flex items-center gap-2">
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
                        <Label htmlFor="qType" className="text-right">Question type</Label>
                        <div className="col-span-3">
                          <Select value={selectedQtype} onValueChange={(value) => setSelectedQtype(value as any)}>
                            <SelectTrigger id="qType">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="mcq">Multiple Choice</SelectItem>
                              <SelectItem value="fillups">Fill in the Blanks</SelectItem>
                              <SelectItem value="match">Matching</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
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
                  {/* Edit Deck Dialog remains; opened via the three-dot menu */}
                  <Dialog open={isEditDeckOpen} onOpenChange={setIsEditDeckOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Deck</DialogTitle>
                        <DialogDescription>Update the deck title and description.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <div>
                          <Label htmlFor="title">Title</Label>
                          <Input id="title" value={editDeckTitle} onChange={(e) => setEditDeckTitle(e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="desc">Description</Label>
                          <Input id="desc" value={editDeckDescription} onChange={(e) => setEditDeckDescription(e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsEditDeckOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveDeck} disabled={isSavingDeck}>{isSavingDeck ? 'Saving...' : 'Save'}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Three-dot actions menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Deck actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditDeckOpen(true)}>Edit Deck</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDeleteDeck} disabled={isDeletingDeck} className="text-destructive focus:text-destructive">
                        {isDeletingDeck ? 'Deleting...' : 'Delete Deck'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              </div>
          </div>
        </div>
      </div>

        {renderContent()}
      {/* Edit Card Dialog */}
        {isOwner && editingCard && (
        <Dialog open={!!editingCard} onOpenChange={(open) => !open && closeEditCard()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Card</DialogTitle>
              <DialogDescription>Update the question, answer, and options.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="q">Question</Label>
                <Input id="q" value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="a">Answer</Label>
                <Input id="a" value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} />
              </div>
              {editingCard.qtype === 'mcq' && (
                <div>
                  <Label>Options</Label>
                  <div className="space-y-2 mt-2">
                    {editOptions.map((opt, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const next = [...editOptions];
                            next[idx] = e.target.value;
                            setEditOptions(next);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEditOptions(editOptions.filter((_, i) => i !== idx))}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <Button variant="secondary" size="sm" onClick={() => setEditOptions([...(editOptions || []), ''])}>
                      Add option
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={closeEditCard}>Cancel</Button>
              <Button onClick={handleSaveCard} disabled={isSavingCard}>{isSavingCard ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>
    );
  };
  return <PageContent />;
}
