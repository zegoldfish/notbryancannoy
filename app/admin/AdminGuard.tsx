"use client";
import type { ReactNode } from "react";
import { useUser } from "@context/UserContext";
import { Unauthorized } from "@app/components/Unauthorized";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { session, status } = useUser();

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (status === "unauthenticated") {
    return (
      <Unauthorized
        title="Ah ah ah..."
        message="You did not say the magic word. Please sign in to continue."
        ctaHref="/signin"
        ctaLabel="Go to sign in"
      />
    );
  }

  if (!session?.user?.isAdmin) {
    return (
      <Unauthorized
        title="Admins only"
        message="You did not say the magic word. Access is limited to administrators."
        ctaHref="/"
        ctaLabel="Return home"
      />
    );
  }

  return <>{children}</>;
}
