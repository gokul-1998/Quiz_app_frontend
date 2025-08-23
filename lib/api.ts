const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface User {
  email: string;
  password: string;
}

export interface Me {
  id: number;
  email: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Deck {
  id: number;
  title: string;
  description?: string;
  tags?: string;
  visibility: 'public' | 'private';
  owner_id: number;
  created_at: string;
  card_count?: number;
  favourite: boolean;
  like_count: number;
  liked: boolean;
}

export interface Card {
  id: number;
  question: string;
  answer: string;
  qtype: 'mcq' | 'fillups' | 'match';
  options?: string[];
}

export interface AIGenerateRequest {
  prompt: string;
  desired_qtype: 'mcq' | 'fillups' | 'match';
  count?: number;
}

export interface AIQuestion {
  question: string;
  answer: string;
  qtype: 'mcq' | 'fillups' | 'match';
  options?: string[];
}

// Testing/Dashboard types based on OpenAPI
export interface TestSessionCreate {
  deck_id: number;
  per_card_seconds?: number; // default 10 on server
  total_time_seconds?: number | null;
}

export interface TestAnswerSubmit {
  card_id: number;
  user_answer: string;
  time_taken?: number | null;
}

export interface TestAnswer extends TestAnswerSubmit {
  is_correct: boolean;
}

export interface TestSessionResult {
  session_id: string;
  deck_title: string;
  deck_owner: string;
  total_cards: number;
  correct_answers: number;
  accuracy: number;
  total_time?: number | null;
  completed_at: string;
  answers: TestAnswer[];
}

export interface TestHistoryItem {
  session_id: string;
  deck_id: number;
  deck_title: string;
  total_cards: number;
  correct_answers: number;
  accuracy: number;
  completed_at?: string | null;
  is_completed: boolean;
}

export interface TestHistoryResponse {
  items: TestHistoryItem[];
  total: number;
  page: number;
  size: number;
}

export interface TestStats {
  total_tests_taken: number;
  total_decks_tested: number;
  average_accuracy: number;
  favorite_subjects: string[];
  recent_tests: Record<string, any>[];
}

class ApiService {
  private dispatchAuthExpired() {
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      } catch {}
    }
  }
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Auth endpoints
  async getMe(): Promise<ApiResponse<Me>> {
    return this.request(`/auth/me`, {
      headers: this.getAuthHeaders(),
    });
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      // Prefer JSON error bodies so callers can surface precise reasons (e.g., { detail: "..." })
      try {
        const errJson = await response.json();
        const msg = typeof errJson?.detail === 'string'
          ? errJson.detail
          : (errJson?.detail ? JSON.stringify(errJson.detail) : JSON.stringify(errJson));
        return { error: msg };
      } catch {
        const error = await response.text();
        return { error };
      }
    }
    
    if (response.status === 204) {
      return { data: {} as T };
    }
    
    const data = await response.json();
    return { data };
  }

  // Centralized request wrapper with 401 refresh-and-retry
  private async request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
    const doFetch = async () => await fetch(`${API_BASE_URL}${path}`, init);
    let response = await doFetch();

    if (response.status !== 401) {
      return this.handleResponse<T>(response);
    }

    // Attempt a single refresh-and-retry
    const refreshed = await this.tryRefresh();
    if (!refreshed) {
      // notify app to logout
      this.dispatchAuthExpired();
      return this.handleResponse<T>(response);
    }

    // Merge updated auth header on retry and always overwrite Authorization with the latest token
    const headers = new Headers(init.headers || {});
    const token = localStorage.getItem('access_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const retryInit: RequestInit = { ...init, headers };
    response = await fetch(`${API_BASE_URL}${path}`, retryInit);
    if (response.status === 401) {
      this.dispatchAuthExpired();
    }
    return this.handleResponse<T>(response);
  }

  private async tryRefresh(): Promise<boolean> {
    const refresh_token = localStorage.getItem('refresh_token');
    if (!refresh_token) return false;

    const { data, error } = await this.refreshToken(refresh_token);
    if (error || !data) return false;

    // Some servers return the full Token, others may return only access token.
    try {
      const maybe = data as unknown as Partial<Token>;
      if (maybe.access_token) {
        localStorage.setItem('access_token', maybe.access_token);
      }
      if (maybe.refresh_token) {
        localStorage.setItem('refresh_token', maybe.refresh_token);
      }
      return true;
    } catch {
      return false;
    }
  }

  // Auth endpoints
  async register(user: User): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return this.handleResponse(response);
  }

  async login(email: string, password: string): Promise<ApiResponse<Token>> {
    // FastAPI's OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
    const body = new URLSearchParams();
    body.append('username', email);
    body.append('password', password);
    body.append('grant_type', 'password');

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    return this.handleResponse(response);
  }

  async refreshToken(refresh_token: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ refresh_token }),
    });
    return this.handleResponse(response);
  }

  async logout(): Promise<ApiResponse<any>> {
    // Invalidate server-side session/cookies if applicable.
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Deck endpoints
  async getMyDecks(): Promise<ApiResponse<Deck[]>> {
    return this.request(`/decks/my`, {
      headers: this.getAuthHeaders(),
    });
  }

  async getPublicDecks(): Promise<ApiResponse<Deck[]>> {
    return this.request(`/decks/public`, {
      headers: this.getAuthHeaders(),
    });
  }

  // (Retain getDecks for dashboard, but new code should use getMyDecks/getPublicDecks)
  async getDecks(params?: {
    search?: string;
    tag?: string;
    visibility?: 'public' | 'private' | 'all';
    page?: number;
    size?: number;
  }): Promise<ApiResponse<Deck[]>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.tag) searchParams.append('tag', params.tag);
    if (params?.visibility) searchParams.append('visibility', params.visibility);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.size) searchParams.append('size', params.size.toString());
    return this.request(`/decks/?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Test result summary endpoint
  async getTestResultSummary(session_id: string): Promise<ApiResponse<{ total_questions: number; correct_count: number; mistake_count: number; score_percent: number }>> {
    const qs = `session_id=${encodeURIComponent(session_id)}`;
    return this.request(`/tests/result-summary?${qs}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
  }

  async createDeck(deck: Omit<Deck, 'id' | 'owner_id' | 'created_at' | 'card_count' | 'favourite' | 'like_count' | 'liked'>): Promise<ApiResponse<Deck>> {
    return this.request(`/decks/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(deck),
    });
  }

  async getDeck(deckId: number): Promise<ApiResponse<Deck>> {
    return this.request(`/decks/${deckId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async updateDeck(deckId: number, updates: Partial<Pick<Deck, 'title' | 'description'>>): Promise<ApiResponse<Deck>> {
    return this.request(`/decks/${deckId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
  }

  async deleteDeck(deckId: number): Promise<ApiResponse<any>> {
    return this.request(`/decks/${deckId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
  }

  async likeDeck(deckId: number): Promise<ApiResponse<any>> {
    return this.request(`/decks/${deckId}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  async unlikeDeck(deckId: number): Promise<ApiResponse<any>> {
    return this.request(`/decks/${deckId}/like`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
  }

  async favoriteDeck(deckId: number): Promise<ApiResponse<any>> {
    return this.request(`/decks/${deckId}/favorite`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  async unfavoriteDeck(deckId: number): Promise<ApiResponse<any>> {
    return this.request(`/decks/${deckId}/favorite`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
  }

  // Card endpoints
  async getCards(deckId: number): Promise<ApiResponse<Card[]>> {
    return this.request(`/decks/${deckId}/cards`, {
      headers: this.getAuthHeaders(),
    });
  }

  async createCard(deckId: number, card: Omit<Card, 'id'>): Promise<ApiResponse<Card>> {
    return this.request(`/decks/${deckId}/cards`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(card),
    });
  }

  async getCard(deckId: number, cardId: number): Promise<ApiResponse<Card>> {
    return this.request(`/decks/${deckId}/cards/${cardId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async updateCard(deckId: number, cardId: number, updates: Partial<Omit<Card, 'id'>>): Promise<ApiResponse<Card>> {
    return this.request(`/decks/${deckId}/cards/${cardId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
  }

  async deleteCard(deckId: number, cardId: number): Promise<ApiResponse<any>> {
    return this.request(`/decks/${deckId}/cards/${cardId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
  }

  // AI endpoints
  async generateCard(request: AIGenerateRequest): Promise<ApiResponse<AIQuestion>> {
    return this.request(`/ai/generate-card`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
  }

  // Dashboard endpoints
  async getDashboard(): Promise<ApiResponse<Record<string, any>>> {
    return this.request(`/dashboard/`, {
      headers: this.getAuthHeaders(),
    });
  }

  async discoverDecks(params?: {
    subject?: string | null;
    difficulty?: string | null;
    min_cards?: number;
    limit?: number;
  }): Promise<ApiResponse<Record<string, any>>> {
    const sp = new URLSearchParams();
    if (params?.subject) sp.append('subject', params.subject);
    if (params?.difficulty) sp.append('difficulty', params.difficulty);
    if (params?.min_cards) sp.append('min_cards', String(params.min_cards));
    if (params?.limit) sp.append('limit', String(params.limit));
    return this.request(`/dashboard/discover?${sp}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async getSubjects(): Promise<ApiResponse<Record<string, any>>> {
    return this.request(`/dashboard/subjects`, {
      headers: this.getAuthHeaders(),
    });
  }

  async getQuickTestOptions(): Promise<ApiResponse<Record<string, any>>> {
    return this.request(`/dashboard/quick-test`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Tests endpoints
  async startTestSession(payload: { deck_id: number; per_card_seconds: number; total_time_seconds?: number }): Promise<ApiResponse<{ session_id: string }>> {
    return this.request(`/tests/start`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        deck_id: Number(payload.deck_id),
        per_card_seconds: Number(payload.per_card_seconds),
        ...(payload.total_time_seconds !== undefined && { total_time_seconds: Number(payload.total_time_seconds) }),
      }),
    });
  }

  async getTestResult(session_id: string): Promise<ApiResponse<TestSessionResult>> {
    const qs = `session_id=${encodeURIComponent(session_id)}`;
    return this.request(`/tests/results?${qs}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
  }

  async getTestHistory(params?: { page?: number; size?: number; deck_id?: number | null; only_completed?: boolean }): Promise<ApiResponse<TestHistoryResponse>> {
    const sp = new URLSearchParams();
    sp.append('page', String(params?.page ?? 1));
    sp.append('size', String(params?.size ?? 20));
    if (params?.deck_id != null) sp.append('deck_id', String(params.deck_id));
    if (params?.only_completed !== undefined) sp.append('only_completed', String(params.only_completed));
    return this.request(`/tests/history?${sp.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
  }

  async submitTestAnswer(session_id: string, payload: TestAnswerSubmit): Promise<ApiResponse<Record<string, any>>> {
    const sp = new URLSearchParams({ session_id });
    // Coerce and sanitize per backend requirements
    const sanitizedAnswer = String(payload.user_answer)
      .replace(/[\u0000-\u001F]/g, '') // remove control chars
      .replace(/"/g, '”')
      .replace(/'/g, '’')
      .replace(/--/g, '—')
      .replace(/\/\*/g, '／＊')
      .replace(/\*\//g, '＊／');
    const body = {
      card_id: Number(payload.card_id),
      user_answer: sanitizedAnswer,
      ...(payload.time_taken != null ? { time_taken: Number(payload.time_taken) } : {}),
    };
    return this.request(`/tests/submit-answer?${sp.toString()}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });
  }

  async completeTestSession(session_id: string, answers: TestAnswer[], started_at?: string): Promise<ApiResponse<TestSessionResult>> {
    const sp = new URLSearchParams({ session_id });
    if (started_at != null) sp.append('started_at', started_at);
    // Coerce list payload to correct types and strip control chars from user_answer
    const body = (answers || []).map(a => ({
      card_id: Number(a.card_id),
      user_answer: String(a.user_answer).replace(/[\u0000-\u001F]/g, ''),
      is_correct: Boolean(a.is_correct),
      ...(a.time_taken != null ? { time_taken: Number(a.time_taken) } : {}),
    }));
    return this.request(`/tests/complete?${sp.toString()}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });
  }

  async getTestStats(): Promise<ApiResponse<TestStats>> {
    return this.request(`/tests/stats`, {
      headers: this.getAuthHeaders(),
    });
  }

  async getTestLeaderboard(params?: { deck_id?: number | null; limit?: number }): Promise<ApiResponse<Record<string, any>>> {
    const sp = new URLSearchParams();
    if (params?.deck_id != null) sp.append('deck_id', String(params.deck_id));
    if (params?.limit != null) sp.append('limit', String(params.limit));
    return this.request(`/tests/leaderboard?${sp.toString()}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async getRandomPublicDeck(subject?: string | null): Promise<ApiResponse<Record<string, any>>> {
    const sp = new URLSearchParams();
    if (subject) sp.append('subject', subject);
    return this.request(`/tests/random-deck?${sp.toString()}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // ... (rest of the code remains the same)

}

export const apiService = new ApiService();