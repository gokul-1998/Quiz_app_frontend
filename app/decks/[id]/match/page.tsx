"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiService, Card, Deck } from "@/lib/api";
import { Card as UICard, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Shuffle, CheckCircle2, XCircle } from "lucide-react";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchPracticePage() {
  const params = useParams();
  const router = useRouter();
  const deckId = Number(params?.id);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [leftItems, setLeftItems] = useState<string[]>([]);
  const [rightItems, setRightItems] = useState<string[]>([]);
  const [rightOrder, setRightOrder] = useState<number[]>([]); // permutation of [0..3]
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [pairs, setPairs] = useState<Record<number, number>>({}); // leftIndex -> rightIndexPermuted
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(deckId)) return;
    (async () => {
      const [{ data: deckData }, { data: cardData }] = await Promise.all([
        apiService.getDeck(deckId),
        apiService.getCards(deckId),
      ]);
      if (deckData) setDeck(deckData);
      const matchCards = (cardData || []).filter((c) => c.qtype === "match");
      setCards(matchCards);
      if (matchCards.length === 0) {
        toast.info("No matching cards in this deck yet.");
      }
    })();
  }, [deckId]);

  const current = cards[index] || null;

  useEffect(() => {
    // initialize state when current card changes
    if (!current) {
      setLeftItems([]);
      setRightItems([]);
      setRightOrder([]);
      setPairs({});
      setSelectedLeft(null);
      setSelectedRight(null);
      setChecked(false);
      setScore(null);
      return;
    }
    const left = (current.question || "").split("|").map((s) => s.trim()).slice(0, 4);
    const right = (current.options || []).map((s) => String(s));
    const order = shuffle([0, 1, 2, 3]);
    setLeftItems(left);
    setRightItems(right);
    setRightOrder(order);
    setPairs({});
    setSelectedLeft(null);
    setSelectedRight(null);
    setChecked(false);
    setScore(null);
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

  const allPaired = useMemo(() => Object.keys(pairs).length === 4, [pairs]);

  const checkAnswers = () => {
    if (!current) return;
    // Correct mapping is identity by row: left i -> right with original index i
    // Right list is permuted; a correct match is pairs[i] points to the index in the permuted array
    // whose original index equals i.
    const correctRightIndexInPerm = (orig: number) => rightOrder.findIndex((ri) => ri === orig);
    let correct = 0;
    for (let i = 0; i < 4; i++) {
      const chosen = pairs[i];
      const expected = correctRightIndexInPerm(i);
      if (chosen === expected) correct++;
    }
    setChecked(true);
    setScore(correct);
  };

  const nextCard = () => {
    setIndex((i) => Math.min(i + 1, Math.max(0, cards.length - 1)));
  };

  const prevCard = () => {
    setIndex((i) => Math.max(0, i - 1));
  };

  const resetShuffle = () => {
    setRightOrder((prev) => shuffle(prev));
    setPairs({});
    setSelectedLeft(null);
    setSelectedRight(null);
    setChecked(false);
    setScore(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push(`/decks/${deckId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Deck
          </Button>
          <h1 className="text-2xl font-semibold">Match Practice</h1>
          {deck && (
            <Badge variant="outline" className="ml-2">{deck.title}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetShuffle}>
            <Shuffle className="h-4 w-4 mr-2" /> Shuffle Right
          </Button>
        </div>
      </div>

      {!current ? (
        <UICard>
          <CardHeader>
            <CardTitle>No matching cards</CardTitle>
            <CardDescription>Create some matching cards to practice.</CardDescription>
          </CardHeader>
        </UICard>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Card {index + 1} of {cards.length}
            </div>
            {checked && (
              <div className="flex items-center gap-2 text-sm">
                {score === 4 ? (
                  <span className="text-green-600 flex items-center"><CheckCircle2 className="h-4 w-4 mr-1" /> Perfect!</span>
                ) : (
                  <span className="text-amber-600 flex items-center"><XCircle className="h-4 w-4 mr-1" /> {score}/4 correct</span>
                )}
              </div>
            )}
          </div>

          <UICard>
            <CardHeader>
              <CardTitle className="text-base">Match the pairs</CardTitle>
              <CardDescription>Click a left item, then a right item to pair them. Repeat for all four.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Left</h3>
                  <div className="space-y-2">
                    {leftItems.map((li, i) => {
                      const paired = pairs[i] != null;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedLeft(i)}
                          className={`w-full text-left p-3 rounded border transition-colors ${
                            selectedLeft === i ? 'border-blue-500 bg-blue-50' : paired ? 'bg-muted' : 'bg-white'
                          }`}
                          disabled={checked}
                        >
                          <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                          {li}
                          {paired && <Badge className="ml-2" variant="secondary">paired</Badge>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right column */}
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
                          disabled={checked}
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

              {/* Pair status */}
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(pairs).map(([l, r]) => (
                  <Badge key={l} variant="outline" className="flex items-center gap-2">
                    {String.fromCharCode(65 + Number(l))} ↔ {Number(r) + 1}
                    <button className="text-xs underline" onClick={() => removePair(Number(l))} disabled={checked}>remove</button>
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center gap-2">
                <Button variant="secondary" onClick={commitPair} disabled={selectedLeft == null || selectedRight == null || checked}>
                  Pair Selected
                </Button>
                <Button onClick={checkAnswers} disabled={!allPaired || checked}>
                  Check Answers
                </Button>
                <Button variant="outline" onClick={resetShuffle}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </UICard>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={prevCard} disabled={index === 0}>Previous</Button>
            <Button variant="outline" onClick={nextCard} disabled={index >= cards.length - 1}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
