"use client";
import { useSession } from "next-auth/react";
import { UserContext } from "@context/UserContext";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  return (
    <UserContext.Provider value={{ session, status }}>
      {children}
    </UserContext.Provider>
  );
}
