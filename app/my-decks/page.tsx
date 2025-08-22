"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyDecksRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/decks");
  }, [router]);
  return null;
}
