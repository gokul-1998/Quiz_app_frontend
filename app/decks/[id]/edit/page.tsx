"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiService, Deck } from "@/lib/api";
import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function EditDeckPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const deckId = parseInt(params.id as string);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
    visibility: "private" as "public" | "private",
  });

  useEffect(() => {
    if (!isAuthenticated || !deckId) return;
    fetchDeck();
  }, [isAuthenticated, deckId]);

  const fetchDeck = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await apiService.getDeck(deckId);
      if (error) {
        toast.error(error);
        router.push("/decks");
        return;
      }
      if (data) {
        setDeck(data);
        setFormData({
          title: data.title,
          description: data.description || "",
          tags: data.tags || "",
          visibility: data.visibility,
        });
      }
    } catch (error) {
      toast.error("Failed to load deck");
      router.push("/decks");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deck) return;

    setIsSaving(true);
    try {
      const { data, error } = await apiService.updateDeck(deck.id, {
        title: formData.title,
        description: formData.description,
        tags: formData.tags,
        visibility: formData.visibility,
      });
      
      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Deck updated successfully");
      router.push(`/decks/${deck.id}`);
    } catch (error) {
      toast.error("Failed to update deck");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <AuthGate>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
              <CardDescription>Loading deck details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Please wait</div>
            </CardContent>
          </Card>
        </div>
      </AuthGate>
    );
  }

  if (!deck) {
    return (
      <AuthGate>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Deck not found</CardTitle>
              <CardDescription>The deck you're looking for doesn't exist</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/decks")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Decks
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/decks/${deck.id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Deck
          </Button>
          <h1 className="text-2xl font-semibold">Edit Deck</h1>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Deck Details</CardTitle>
            <CardDescription>
              Update your deck information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter deck title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Enter deck description (optional)"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleInputChange("tags", e.target.value)}
                  placeholder="Enter tags separated by commas (e.g., math, algebra, geometry)"
                />
                <p className="text-sm text-muted-foreground">
                  Separate multiple tags with commas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value) => handleInputChange("visibility", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {formData.visibility === "public" 
                    ? "Anyone can view and use this deck" 
                    : "Only you can view and use this deck"
                  }
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isSaving || !formData.title.trim()}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/decks/${deck.id}`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthGate>
  );
}
