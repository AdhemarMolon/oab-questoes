"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function PaymentStatusRefresh({
  pending,
}: {
  pending: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!pending) return;

    const interval = window.setInterval(() => router.refresh(), 3_000);
    const timeout = window.setTimeout(
      () => window.clearInterval(interval),
      60_000,
    );

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [pending, router]);

  return null;
}
