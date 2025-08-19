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

interface CreateCardDialogProps {
  deckId: number;
  onCardCreated: (card: CardType) => void;
}

export function CreateCardDialog({ deckId, onCardCreated }: CreateCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [qtype, setQtype] = useState<'mcq' | 'fillups' | 'match'>('mcq');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim()) {
      toast.error('Please fill in both question and answer');
      return;
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
    }

    setIsLoading(true);
    
    try {
      const cardData = {
        question: question.trim(),
        answer: answer.trim(),
        qtype,
        ...(qtype === 'mcq' && { options: options.map(opt => opt.trim()) }),
      };

      const { data, error } = await apiService.createCard(deckId, cardData);
      
      if (error) {
        toast.error(typeof error === 'string' ? error : 'Failed to create card');
        return;
      }

      if (data) {
        toast.success('Card created successfully');
        onCardCreated(data);
        setOpen(false);
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

  const canPreview = question.trim() && answer.trim() && (qtype !== 'mcq' || options.every(opt => opt.trim()));

  const previewCard: CardType = {
    id: 0,
    question,
    answer,
    qtype,
    ...(qtype === 'mcq' && { options }),
  };

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