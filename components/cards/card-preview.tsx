'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Card as CardType } from '@/lib/api';
import { HelpCircle, CheckCircle, WatchIcon as MatchesIcon, CreditCard } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

interface CardPreviewProps {
  card: CardType;
  showAnswer?: boolean;
}

export function CardPreview({ card, showAnswer = false }: CardPreviewProps) {
  const getQuestionTypeIcon = (qtype: string) => {
    switch (qtype) {
      case 'mcq':
        return <CheckCircle className="h-4 w-4" />;
      case 'fillups':
        return <HelpCircle className="h-4 w-4" />;
      case 'match':
        return <MatchesIcon className="h-4 w-4" />;
      case 'flashcard':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  const getQuestionTypeLabel = (qtype: string) => {
    switch (qtype) {
      case 'mcq':
        return 'Multiple Choice';
      case 'fillups':
        return 'Fill in the Blanks';
      case 'match':
        return 'Matching';
      case 'flashcard':
        return 'Flashcard';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="flex items-center gap-1">
            {getQuestionTypeIcon(card.qtype)}
            {getQuestionTypeLabel(card.qtype)}
          </Badge>
        </div>
        
        <div className="space-y-4">
          {card.qtype === 'flashcard' ? (
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Front</h3>
              <div className="prose prose-sm max-w-none">
                <MDEditor.Markdown source={card.question} />
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Question</h3>
              <p className="text-base leading-relaxed">{card.question}</p>
            </div>
          )}

          {card.qtype === 'mcq' && card.options && (
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Options</h3>
              <div className="space-y-2">
                {card.options.map((option, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition-colors ${
                      showAnswer && option === card.answer
                        ? 'bg-green-50 border-green-200 text-green-900'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <span className="font-medium text-sm text-gray-500 mr-2">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showAnswer && (
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">
                {card.qtype === 'flashcard' ? 'Back' : 'Answer'}
              </h3>
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                {card.qtype === 'flashcard' ? (
                  <div className="prose prose-sm max-w-none text-green-900">
                    <MDEditor.Markdown source={card.answer} />
                  </div>
                ) : (
                  <p className="text-green-900 font-medium">{card.answer}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}