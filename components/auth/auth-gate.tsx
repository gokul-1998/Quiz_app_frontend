"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

// Client-side auth guard: redirects to /login if no access_token
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    // Stable placeholder to avoid hydration mismatches
    return <div />;
  }

  return <>{children}</>;
}
