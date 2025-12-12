"use client";
import { SessionProvider } from "next-auth/react";
import { UserProvider } from "@context/UserProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <UserProvider>
          {children}
        </UserProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
