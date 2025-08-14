"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiService, Token } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiService.login(email, password);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        const tok = res.data as Token;
        localStorage.setItem("access_token", tok.access_token);
        localStorage.setItem("refresh_token", tok.refresh_token);
        // Navigate to dashboard
        router.push("/dashboard");
      } else {
        setError("Unexpected response from server");
      }
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 border rounded-lg p-6 shadow-sm bg-white"
      >
        <h1 className="text-2xl font-semibold">Sign in</h1>
        {error && (
          <div className="text-sm text-red-600 border border-red-200 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label className="block text-sm">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-sm text-center">
          No account? <a className="underline" href="/register">Register</a>
        </p>
      </form>
    </div>
  );
}
