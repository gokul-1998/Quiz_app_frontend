'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Deck, apiService } from '@/lib/api';
import { CreateCardDialog } from '@/components/cards/create-card-dialog';
import { Heart, Star, Eye, Calendar, MoreVertical, Trash2, Edit } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface DeckCardProps {
  deck: Deck;
  canManage?: boolean; // true if current user is the owner
  onUpdate?: (updatedDeck: Deck) => void;
  onDelete?: (deckId: number) => void;
}

export function DeckCard({ deck, canManage = false, onUpdate, onDelete }: DeckCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiking(true);
    
    try {
      if (deck.liked) {
        await apiService.unlikeDeck(deck.id);
        toast.success('Deck unliked');
      } else {
        await apiService.likeDeck(deck.id);
        toast.success('Deck liked');
      }
      
      // Update the deck state
      if (onUpdate) {
        onUpdate({
          ...deck,
          liked: !deck.liked,
          like_count: deck.liked ? deck.like_count - 1 : deck.like_count + 1,
        });
      }
    } catch (error) {
      toast.error('Failed to update like status');
    } finally {
      setIsLiking(false);
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavoriting(true);
    
    try {
      if (deck.favourite) {
        await apiService.unfavoriteDeck(deck.id);
        toast.success('Removed from favorites');
      } else {
        await apiService.favoriteDeck(deck.id);
        toast.success('Added to favorites');
      }
      
      // Update the deck state
      if (onUpdate) {
        onUpdate({
          ...deck,
          favourite: !deck.favourite,
        });
      }
    } catch (error) {
      toast.error('Failed to update favorite status');
    } finally {
      setIsFavoriting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      await apiService.deleteDeck(deck.id);
      toast.success('Deck deleted successfully');
      if (onDelete) {
        onDelete(deck.id);
      }
    } catch (error) {
      toast.error('Failed to delete deck');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewDeck = () => {
    router.push(`/decks/${deck.id}`);
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

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 shadow-sm hover:shadow-md" onClick={handleViewDeck}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold leading-6 truncate">
              {deck.title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {deck.description || 'No description'}
            </CardDescription>
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/decks/${deck.id}/edit`);
                }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="text-destructive"
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="flex flex-wrap gap-1 mt-2">
          {parseTags(deck.tags).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{deck.card_count || 0} cards</span>
            </div>
            <Badge variant={deck.visibility === 'public' ? 'default' : 'outline'}>
              {deck.visibility}
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(deck.created_at)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center pt-3">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${deck.liked ? 'text-red-500' : 'text-muted-foreground'}`}
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart className={`h-4 w-4 mr-1 ${deck.liked ? 'fill-current' : ''}`} />
            <span className="text-xs">{deck.like_count}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${deck.favourite ? 'text-yellow-500' : 'text-muted-foreground'}`}
            onClick={handleFavorite}
            disabled={isFavoriting}
          >
            <Star className={`h-4 w-4 ${deck.favourite ? 'fill-current' : ''}`} />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={(e) => {
          e.stopPropagation();
          handleViewDeck();
        }}>
          View Deck
        </Button>
        {canManage && (
          <CreateCardDialog
            deckId={deck.id}
            onCardCreated={(newCard) => {
              if (onUpdate) {
                onUpdate({ ...deck, card_count: (deck.card_count || 0) + 1 });
              }
              toast.success('Card created');
            }}
          />
        )}
      </CardFooter>
    </Card>
  );
}