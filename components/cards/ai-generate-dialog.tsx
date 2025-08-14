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
  const [generatedCard, setGeneratedCard] = useState<CardType | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    
    try {
      const request: AIGenerateRequest = {
        prompt: prompt.trim(),
        desired_qtype: qtype,
      };

      const { data, error } = await apiService.generateCard(request);
      
      if (error) {
        toast.error('Failed to generate card');
        return;
      }

      if (data) {
        setGeneratedCard({
          id: 0,
          question: data.question,
          answer: data.answer,
          qtype: data.qtype,
          options: data.options,
        });
        toast.success('Card generated successfully');
      }
    } catch (error) {
      toast.error('Failed to generate card');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateCard = async () => {
    if (!generatedCard) return;

    setIsCreating(true);
    
    try {
      const cardData = {
        question: generatedCard.question,
        answer: generatedCard.answer,
        qtype: generatedCard.qtype,
        ...(generatedCard.qtype === 'mcq' && { options: generatedCard.options }),
      };

      const { data, error } = await apiService.createCard(deckId, cardData);
      
      if (error) {
        toast.error('Failed to create card');
        return;
      }

      if (data) {
        toast.success('Card created successfully');
        onCardCreated(data);
        setOpen(false);
        resetForm();
      }
    } catch (error) {
      toast.error('Failed to create card');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setPrompt('');
    setQtype('mcq');
    setGeneratedCard(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleRegenerate = () => {
    setGeneratedCard(null);
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
        {generatedCard ? (
          <div>
            <DialogHeader>
              <DialogTitle>AI Generated Card</DialogTitle>
              <DialogDescription>
                Review the AI-generated card and add it to your deck.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <CardPreview card={generatedCard} showAnswer={true} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleRegenerate} disabled={isCreating}>
                Regenerate
              </Button>
              <Button onClick={handleCreateCard} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add to Deck
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
                  placeholder="Describe the topic you want to create a flashcard about..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Example: "Explain photosynthesis" or "Create a question about World War 2"
                </p>
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