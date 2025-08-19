"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

// Client-side auth guard: redirects to /login if no access_token
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    // Allowlist public auth routes (include home '/' which shows the auth form)
    const publicPaths = ["/", "/login", "/register"];
    const isPublic = publicPaths.some((p) => pathname === p || pathname?.startsWith(p));

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!isPublic && !token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [pathname, router]);

  // Global handler: auto-logout on auth expiry events from API layer
  useEffect(() => {
    const handler = () => {
      logout();
      router.replace("/login");
    };
    if (typeof window !== "undefined") {
      window.addEventListener("auth:expired", handler as EventListener);
      return () => window.removeEventListener("auth:expired", handler as EventListener);
    }
  }, [logout, router]);

  if (!ready) {
    // Stable placeholder to avoid hydration mismatches
    return <div />;
  }

  return <>{children}</>;
}
