"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";

interface UserContextValue {
  session: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  return (
    <UserContext.Provider value={{ session, status }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
