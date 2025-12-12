"use client";
import { createContext, useContext } from "react";
import { Session } from "next-auth";

export interface UserContextValue {
  session: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
}

export const UserContext = createContext<UserContextValue | undefined>(undefined);

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
