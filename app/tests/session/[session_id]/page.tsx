'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiService, Card as CardType, TestAnswer, TestAnswerSubmit } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const DEFAULT_PER_CARD_SECONDS = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TestRunnerPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();

  const sessionId = params.session_id as string;
  const deckIdParam = search.get('deckId');
  const perCardParam = search.get('perCard');
  const deckId = deckIdParam ? parseInt(deckIdParam) : null;
  const perCardSeconds = perCardParam ? Math.max(3, parseInt(perCardParam)) : DEFAULT_PER_CARD_SECONDS;
  const qtypeParam = search.get('qtype');
  const onlyQtype = (qtypeParam === 'mcq' || qtypeParam === 'fillups' || qtypeParam === 'match') ? qtypeParam : null;

  const [cards, setCards] = useState<CardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number>(perCardSeconds);
  const [answers, setAnswers] = useState<TestAnswerSubmit[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // Match question state
  const [leftItems, setLeftItems] = useState<string[]>([]);
  const [rightItems, setRightItems] = useState<string[]>([]);
  const [rightOrder, setRightOrder] = useState<number[]>([]); // permutation of indices
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [pairs, setPairs] = useState<Record<number, number>>({}); // left index -> right position (in permuted list)
  const allPaired = useMemo(() => Object.keys(pairs).length === 4, [pairs]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId || !deckId) {
      toast.error('Invalid test session.');
      router.push('/dashboard');
      return;
    }
    loadCards(deckId);
  }, [sessionId, deckId, router]);

  useEffect(() => {
    // start/reset per-card timer
    clearTimer();
    setTimeLeft(perCardSeconds);
    startedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimer();
          handleAutoNext();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return clearTimer;
  }, [currentIndex, perCardSeconds]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const loadCards = async (deckId: number) => {
    try {
      const { data, error } = await apiService.getCards(deckId);
      if (error || !data) {
        toast.error('Failed to load questions');
        router.push(`/decks/${deckId}`);
        return;
      }
      // keep original order (no local randomization), optional filter by qtype
      const items = onlyQtype ? data.filter((c) => c.qtype === onlyQtype) : data;
      setCards(items);
    } catch (e) {
      toast.error('Failed to load questions');
      router.push(`/decks/${deckId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const total = cards.length;
  const current = cards[currentIndex];
  const progress = useMemo(() => (total ? Math.round(((currentIndex) / total) * 100) : 0), [currentIndex, total]);

  // Initialize/reset match state for each match question
  useEffect(() => {
    if (!current || current.qtype !== 'match') {
      setLeftItems([]);
      setRightItems([]);
      setRightOrder([]);
      setPairs({});
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }
    const left = (current.question || '').split('|').map((s) => s.trim()).slice(0, 4);
    const right = (current.options || []).map((s) => String(s));
    const order = shuffle([0, 1, 2, 3]);
    setLeftItems(left);
    setRightItems(right);
    setRightOrder(order);
    setPairs({});
    setSelectedLeft(null);
    setSelectedRight(null);
  }, [current]);

  const commitPair = () => {
    if (selectedLeft == null || selectedRight == null) return;
    setPairs((prev) => ({ ...prev, [selectedLeft]: selectedRight }));
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  const removePair = (li: number) => {
    setPairs((prev) => {
      const n = { ...prev } as Record<number, number>;
      delete n[li];
      return n;
    });
  };

  const createMatchAnswerString = () => {
    const parts: string[] = [];
    for (let i = 0; i < 4; i++) {
      const pos = (pairs as Record<number, number>)[i];
      if (typeof pos !== 'number' || !rightOrder.length) {
        parts.push(`${i}->`);
      } else {
        const origIndex = rightOrder[pos];
        parts.push(`${i}->${origIndex}`);
      }
    }
    return parts.join(',');
  };

  const submitCurrentAnswer = async (user_answer: string) => {
    if (!current) return true;
    try {
      setIsSubmitting(true);
      const elapsed = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : null;
      const payload: TestAnswerSubmit = {
        card_id: current.id,
        user_answer,
        time_taken: elapsed ?? null,
      };
      const { error } = await apiService.submitTestAnswer(sessionId, payload);
      if (error) {
        toast.error('Failed to submit answer');
        return false;
      }
      setAnswers((prev) => [...prev, payload]);
      setSubmitted(true);
      setShowAnswer(true);
      clearTimer();
      return true;
    } catch (e) {
      toast.error('Failed to submit answer');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!current) return;
    if (!submitted) {
      let userAns = answer;
      if (current.qtype === 'match') {
        if (!allPaired) {
          toast.error('Please pair all items before submitting');
          return;
        }
        userAns = createMatchAnswerString();
      }
      const ok = await submitCurrentAnswer(userAns);
      if (!ok) return;
      return; // stay to show the answer; button will change to Next/Finish
    }
    // already submitted and answer revealed -> advance
    setAnswer('');
    setSubmitted(false);
    setShowAnswer(false);
    if (currentIndex + 1 < total) {
      setCurrentIndex((i) => i + 1);
    } else {
      await handleFinish();
    }
  };

  const handleAutoNext = async () => {
    if (!current) return;
    const ok = await submitCurrentAnswer('');
    if (!ok) return;
    // Do not auto-advance; reveal the answer and let user click Next/Finish
  };

  const handleFinish = async () => {
    try {
      clearTimer();
      // Answers were submitted incrementally; pass empty array to satisfy type
      const { data, error } = await apiService.completeTestSession(sessionId, []);
      if (error) {
        toast.error('Failed to complete test');
        return;
      }
      toast.success('Test completed');
      if (data && typeof window !== 'undefined') {
        try {
          localStorage.setItem('latest_test_result', JSON.stringify(data));
        } catch {}
      }
      router.push(`/tests/session/${sessionId}/result`);
    } catch (e) {
      toast.error('Failed to complete test');
    }
  };

  const renderQuestion = (card: CardType) => {
    // Matching question UI
    if (card.qtype === 'match') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Left</h3>
              <div className="space-y-2">
                {leftItems.map((li, i) => {
                  const paired = (pairs as Record<number, number>)[i] != null;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedLeft(i)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        selectedLeft === i ? 'border-blue-500 bg-blue-50' : paired ? 'bg-muted' : 'bg-white'
                      }`}
                      disabled={submitted}
                    >
                      <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                      {li}
                      {paired && <Badge className="ml-2" variant="secondary">paired</Badge>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Right</h3>
              <div className="space-y-2">
                {rightOrder.map((origIndex, pos) => {
                  const value = rightItems[origIndex];
                  const isUsed = Object.values(pairs).includes(pos);
                  return (
                    <button
                      key={pos}
                      onClick={() => setSelectedRight(pos)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        selectedRight === pos ? 'border-blue-500 bg-blue-50' : isUsed ? 'bg-muted' : 'bg-white'
                      }`}
                      disabled={submitted}
                    >
                      <span className="font-medium mr-2">{pos + 1}.</span>
                      {value}
                      {isUsed && <Badge className="ml-2" variant="secondary">paired</Badge>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(pairs).map(([l, r]) => (
              <Badge key={l} variant="outline" className="flex items-center gap-2">
                {String.fromCharCode(65 + Number(l))} ↔ {Number(r) + 1}
                <button
                  className="text-xs underline"
                  onClick={() => removePair(Number(l))}
                  disabled={submitted}
                >
                  remove
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={commitPair}
              disabled={selectedLeft == null || selectedRight == null || submitted}
            >
              Pair Selected
            </Button>
          </div>
        </div>
      );
    }

    // basic renderer; supports MCQ when options present, else free text
    if (card.qtype === 'mcq' && card.options && card.options.length > 0) {
      return (
        <div className="space-y-2">
          {card.options.map((opt, idx) => (
            <label key={idx} className={`flex items-center gap-2 rounded border p-2 cursor-pointer ${answer === opt ? 'bg-muted' : ''}`}>
              <input
                type="radio"
                name="mcq"
                value={opt}
                checked={answer === opt}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswer(e.target.value)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    // fillups/match/default -> simple input
    return (
      <Input
        placeholder="Type your answer..."
        value={answer}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswer(e.target.value)}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleNext();
          }
        }}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted w-1/3 rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-4 bg-muted w-2/3 rounded mb-2" />
            <div className="h-4 bg-muted w-1/2 rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current || total === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <CardTitle className="mb-2">No questions available</CardTitle>
        <CardDescription>Try adding cards to this deck first.</CardDescription>
        <div className="mt-6">
          <Button onClick={() => router.push(`/decks/${deckId}`)}>Back to Deck</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <Badge variant="secondary">Question {currentIndex + 1} / {total}</Badge>
        <Badge variant={timeLeft <= 3 ? 'destructive' : 'default'}>Time: {timeLeft}s</Badge>
      </div>
      <Progress value={progress} className="mb-6" />

      <Card>
        <CardHeader>
          <CardTitle>{current.question}</CardTitle>
          <CardDescription>Answer the question before the timer runs out.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderQuestion(current)}
          {showAnswer && (
            <div className="mt-2 rounded border p-3 text-sm">
              <div className="font-medium mb-1">Correct Answer</div>
              <div className="text-muted-foreground whitespace-pre-wrap">{current.answer}</div>
            </div>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => router.push(`/decks/${deckId}`)}>Quit</Button>
            <Button onClick={handleNext} disabled={isSubmitting || (!submitted && current.qtype === 'match' && !allPaired)}>
              {!submitted ? 'Submit' : (currentIndex + 1 === total ? 'Finish' : 'Next')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
