'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card as CardType, apiService, AIGenerateRequest } from '@/lib/api';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CardPreview } from './card-preview';

interface AIGenerateDialogProps {
  deckId: number;
  onCardCreated: (card: CardType) => void;
}

export function AIGenerateDialog({ deckId, onCardCreated }: AIGenerateDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [qtype, setQtype] = useState<'mcq' | 'fillups' | 'match'>('mcq');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [count, setCount] = useState<number>(1);
  const [generatedCards, setGeneratedCards] = useState<CardType[]>([]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    if (!Number.isFinite(count) || count <= 0) {
      toast.error('Please enter a valid number of cards to generate');
      return;
    }

    setIsGenerating(true);
    
    try {
      const results: CardType[] = [];
      for (let i = 0; i < count; i++) {
        const request: AIGenerateRequest = {
          prompt: prompt.trim(),
          desired_qtype: qtype,
        };
        const { data, error } = await apiService.generateCard(request);
        if (error || !data) {
          toast.error('Failed to generate one of the cards');
          continue;
        }
        results.push({
          id: 0,
          question: data.question,
          answer: data.answer,
          qtype: data.qtype,
          options: data.options,
        });
      }
      setGeneratedCards(results);
      if (results.length > 0) toast.success(`Generated ${results.length} card(s)`);
    } catch (error) {
      toast.error('Failed to generate card');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateCard = async (card?: CardType) => {
    const toCreate = card ?? generatedCards[0];
    if (!toCreate) return;

    setIsCreating(true);
    
    try {
      const cardData = {
        question: toCreate.question,
        answer: toCreate.answer,
        qtype: toCreate.qtype,
        ...(toCreate.qtype === 'mcq' && { options: toCreate.options }),
      };

      const { data, error } = await apiService.createCard(deckId, cardData);
      
      if (error) {
        toast.error('Failed to create card');
        return;
      }

      if (data) {
        toast.success('Card created successfully');
        onCardCreated(data);
        // Remove the first matching generated card if present, keep dialog open
        if (!card) {
          setGeneratedCards(prev => prev.slice(1));
        } else {
          setGeneratedCards(prev => prev.filter((c) => c !== card));
        }
      }
    } catch (error) {
      toast.error('Failed to create card');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateAll = async () => {
    if (generatedCards.length === 0) return;
    setIsCreating(true);
    try {
      for (const gc of generatedCards) {
        const cardData = {
          question: gc.question,
          answer: gc.answer,
          qtype: gc.qtype,
          ...(gc.qtype === 'mcq' && { options: gc.options }),
        };
        const { data } = await apiService.createCard(deckId, cardData);
        if (data) onCardCreated(data);
      }
      toast.success(`Added ${generatedCards.length} card(s) to deck`);
      setGeneratedCards([]);
      // Keep dialog open for more operations
    } catch (_) {
      toast.error('Failed to add one or more cards');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setPrompt('');
    setQtype('mcq');
    setCount(1);
    setGeneratedCards([]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleRegenerate = () => {
    setGeneratedCards([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="mr-2 h-4 w-4" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {generatedCards.length > 0 ? (
          <div>
            <DialogHeader>
              <DialogTitle>AI Generated Card</DialogTitle>
              <DialogDescription>
                Review the AI-generated card(s) and add them to your deck.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[50vh] overflow-y-auto">
              {generatedCards.map((c, idx) => (
                <div key={idx} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-muted-foreground">Card {idx + 1}</div>
                    <Button size="sm" variant="outline" onClick={() => handleCreateCard(c)} disabled={isCreating}>
                      Add This
                    </Button>
                  </div>
                  <CardPreview card={c} showAnswer={true} />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleRegenerate} disabled={isCreating}>
                Regenerate
              </Button>
              <Button onClick={handleCreateAll} disabled={isCreating || generatedCards.length === 0}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add All
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleGenerate}>
            <DialogHeader>
              <DialogTitle>Generate Card with AI</DialogTitle>
              <DialogDescription>
                Describe what you want to learn about, and AI will generate a flashcard for you.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="qtype">Question Type</Label>
                <Select value={qtype} onValueChange={(value: 'mcq' | 'fillups' | 'match') => setQtype(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                    <SelectItem value="fillups">Fill in the Blanks</SelectItem>
                    <SelectItem value="match">Matching</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="prompt">Prompt *</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe the topic you want to create flashcards about..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Example: "Explain photosynthesis" or "Create questions about World War 2"
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="count">Number of cards</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  disabled={isGenerating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isGenerating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Card
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}