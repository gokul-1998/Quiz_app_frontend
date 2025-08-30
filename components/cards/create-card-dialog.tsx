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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card as CardType, apiService } from '@/lib/api';
import { Plus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { CardPreview } from './card-preview';
import { MarkdownEditor } from '@/components/ui/markdown-editor';

interface CreateCardDialogProps {
  deckId: number;
  onCardCreated: (card: CardType) => void;
}

export function CreateCardDialog({ deckId, onCardCreated }: CreateCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [qtype, setQtype] = useState<'mcq' | 'fillups' | 'match' | 'flashcard'>('mcq');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  // Match type: exactly 4 pairs (left prompts and right answers)
  const [matchLeft, setMatchLeft] = useState<string[]>(['', '', '', '']);
  const [matchRight, setMatchRight] = useState<string[]>(['', '', '', '']);
  // Flashcard type: front and back
  const [flashcardFront, setFlashcardFront] = useState('');
  const [flashcardBack, setFlashcardBack] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate basics for different question types
    if (qtype === 'flashcard') {
      if (!flashcardFront.trim() || !flashcardBack.trim()) {
        toast.error('Please fill in both front and back of the flashcard');
        return;
      }
    } else if (qtype !== 'match') {
      if (!question.trim() || !answer.trim()) {
        toast.error('Please fill in both question and answer');
        return;
      }
    }

    if (qtype === 'mcq') {
      const trimmedOptions = options.map(o => o.trim()).filter(Boolean);
      if (trimmedOptions.length < 2) {
        toast.error('Please provide at least 2 options for multiple choice');
        return;
      }
      if (trimmedOptions.some(option => option.length === 0)) {
        toast.error('Please fill in all options for multiple choice questions');
        return;
      }
      if (!trimmedOptions.includes(answer.trim())) {
        toast.error('For MCQ, the answer must exactly match one of the options');
        return;
      }
    } else if (qtype === 'match') {
      const left = matchLeft.map(v => v.trim());
      const right = matchRight.map(v => v.trim());
      if (left.length !== 4 || right.length !== 4) {
        toast.error('Matching requires exactly 4 pairs');
        return;
      }
      if (left.some(v => !v) || right.some(v => !v)) {
        toast.error('Please fill all 8 fields for matching');
        return;
      }
    }

    setIsLoading(true);
    
    try {
      let cardData: any = {};

      if (qtype === 'match') {
        // For matching: send pairs array as expected by backend
        const left = matchLeft.map(v => v.trim());
        const right = matchRight.map(v => v.trim());
        const pairs = left.map((leftItem, index) => ({
          left: leftItem,
          right: right[index]
        }));
        cardData = {
          question: 'Match the following items',
          answer: '',
          qtype: 'match',
          pairs: pairs,
        };
      } else if (qtype === 'flashcard') {
        // For flashcard: question is front, answer is back
        cardData = {
          question: flashcardFront.trim(),
          answer: flashcardBack.trim(),
          qtype: 'flashcard',
        };
      } else {
        cardData = {
          question: question.trim(),
          answer: answer.trim(),
          qtype,
          ...(qtype === 'mcq' && { options: options.map(opt => opt.trim()) }),
        };
      }

      const { data, error } = await apiService.createCard(deckId, cardData);
      
      if (error) {
        toast.error(typeof error === 'string' ? error : 'Failed to create card');
        return;
      }

      if (data) {
        toast.success('Card created successfully');
        onCardCreated(data);
        // Keep dialog open to allow adding more cards
        resetForm();
      }
    } catch (error: any) {
      const msg = error?.message || 'Failed to create card';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setQtype('mcq');
    setOptions(['', '', '', '']);
    setMatchLeft(['', '', '', '']);
    setMatchRight(['', '', '', '']);
    setFlashcardFront('');
    setFlashcardBack('');
    setShowPreview(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const canPreview =
    qtype === 'match'
      ? matchLeft.every(v => v.trim()) && matchRight.every(v => v.trim())
      : qtype === 'flashcard'
      ? flashcardFront.trim() && flashcardBack.trim()
      : question.trim() && answer.trim() && (qtype !== 'mcq' || options.every(opt => opt.trim()));

  const previewCard: CardType = (() => {
    if (qtype === 'match') {
      return {
        id: 0,
        question: matchLeft.join('|'),
        answer: '0->0,1->1,2->2,3->3',
        qtype: 'match',
        options: matchRight,
      } as CardType;
    }
    if (qtype === 'flashcard') {
      return {
        id: 0,
        question: flashcardFront,
        answer: flashcardBack,
        qtype: 'flashcard',
      } as CardType;
    }
    return {
      id: 0,
      question,
      answer,
      qtype,
      ...(qtype === 'mcq' && { options }),
    } as CardType;
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {showPreview ? (
          <div>
            <DialogHeader>
              <DialogTitle>Card Preview</DialogTitle>
              <DialogDescription>
                Review your card before creating it.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <CardPreview card={previewCard} showAnswer={true} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPreview(false)}>
                Edit
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Card
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create New Card</DialogTitle>
              <DialogDescription>
                Add a new flashcard to your deck. Choose the question type and fill in the details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="qtype">Question Type</Label>
                <Select value={qtype} onValueChange={(value: 'mcq' | 'fillups' | 'match' | 'flashcard') => setQtype(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                    <SelectItem value="fillups">Fill in the Blanks</SelectItem>
                    <SelectItem value="match">Matching</SelectItem>
                    <SelectItem value="flashcard">Flashcard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {qtype === 'flashcard' ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="flashcard-front">Front of Card *</Label>
                    <MarkdownEditor
                      value={flashcardFront}
                      onChange={setFlashcardFront}
                      placeholder="Enter the front of your flashcard (e.g., question, term, concept). Supports **markdown** and image paste!"
                      disabled={isLoading}
                      height={150}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="flashcard-back">Back of Card *</Label>
                    <MarkdownEditor
                      value={flashcardBack}
                      onChange={setFlashcardBack}
                      placeholder="Enter the back of your flashcard (e.g., answer, definition, explanation). Supports **markdown** and image paste!"
                      disabled={isLoading}
                      height={150}
                    />
                  </div>
                </>
              ) : qtype !== 'match' ? (
                <div className="grid gap-2">
                  <Label htmlFor="question">Question *</Label>
                  <Textarea
                    id="question"
                    placeholder="Enter your question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                  />
                </div>
              ) : (
                <div className="grid gap-3">
                  <Label>Matching Pairs (exactly 4)</Label>
                  {[0,1,2,3].map((i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 items-center">
                      <Input
                        placeholder={`Left ${i + 1}`}
                        value={matchLeft[i]}
                        onChange={(e) => {
                          const next = [...matchLeft];
                          next[i] = e.target.value;
                          setMatchLeft(next);
                        }}
                        disabled={isLoading}
                      />
                      <Input
                        placeholder={`Right ${i + 1}`}
                        value={matchRight[i]}
                        onChange={(e) => {
                          const next = [...matchRight];
                          next[i] = e.target.value;
                          setMatchRight(next);
                        }}
                        disabled={isLoading}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Right side will be shuffled during practice.</p>
                </div>
              )}

              {qtype === 'mcq' && (
                <div className="grid gap-2">
                  <Label>Options *</Label>
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground min-w-[20px]">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <Input
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        disabled={isLoading}
                      />
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    disabled={isLoading}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Option
                  </Button>
                </div>
              )}

              {qtype !== 'match' && (
                <div className="grid gap-2">
                  <Label htmlFor="answer">Answer *</Label>
                  <Textarea
                    id="answer"
                    placeholder="Enter the correct answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={isLoading}
                    rows={2}
                  />
                  {qtype === 'mcq' && (
                    <p className="text-xs text-muted-foreground">
                      For multiple choice, enter the exact text of the correct option.
                    </p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              {canPreview && (
                <Button type="button" variant="outline" onClick={() => setShowPreview(true)} disabled={isLoading}>
                  Preview
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Card
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}