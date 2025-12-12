"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@context/UserContext";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, status } = useUser();

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && !session?.user?.isAdmin)) {
      router.push("/");
    }
  }, [status, session, router]);

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!session?.user?.isAdmin) return null;

  return <>{children}</>;
}
