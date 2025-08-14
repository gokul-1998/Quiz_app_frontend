"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    setLoading(true);
    try {
      const res = await apiService.register({ email, password });
      if (res.error) {
        setError(res.error);
      } else {
        setOk("Registered successfully. Redirecting to sign in...");
        setTimeout(() => router.push("/login"), 800);
      }
    } catch (err: any) {
      setError(err?.message ?? "Registration failed");
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
        <h1 className="text-2xl font-semibold">Create account</h1>
        {error && (
          <div className="text-sm text-red-600 border border-red-200 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        {ok && (
          <div className="text-sm text-green-700 border border-green-200 bg-green-50 p-2 rounded">
            {ok}
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
          {loading ? "Creating..." : "Create account"}
        </button>
        <p className="text-sm text-center">
          Already have an account? <a className="underline" href="/login">Sign in</a>
        </p>
      </form>
    </div>
  );
}
