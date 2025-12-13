"use client";

import Link from "next/link";
import { useUser } from "@context/UserContext";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { SignInButton } from "@app/components/SignInButton";

type NavItem = {
  href: string;
  label: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
};

const navItems: NavItem[] = [
  { href: "/media", label: "Gallery", requiresAuth: true },
  { href: "/media/upload", label: "Upload", requiresAuth: true },
  { href: "/claude", label: "Claude", requiresAuth: true },
  { href: "/admin", label: "Admin", requiresAuth: true, requiresAdmin: true },
  { href: "/admin/users", label: "Users", requiresAuth: true, requiresAdmin: true },
];

export default function Nav() {
  const { session, status } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = session?.user?.isAdmin;

  return (
    <nav className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        {/* Logo / Home */}
        <Link href="/" className="text-lg font-bold text-slate-900 hover:text-slate-700">
          Home
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          {status === "authenticated" && (
            <>
              {navItems.map((item) => {
                if (item.requiresAdmin && !isAdmin) return null;
                return (
                  <Link key={item.href} href={item.href} className="text-sm text-slate-700 hover:text-slate-900">
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            {status === "loading" && (
              <div className="text-xs text-slate-500">Loading...</div>
            )}
            {status === "unauthenticated" && (
              <SignInButton size="sm" />
            )}
            {status === "authenticated" && (
              <>
                <span className="text-sm text-slate-700">{session?.user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          {status === "authenticated" && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded"
            >
              ☰
            </button>
          )}
          {status === "unauthenticated" && (
            <SignInButton size="sm" />
          )}
          {status === "authenticated" && (
            <button
              onClick={() => signOut()}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              Out
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && status === "authenticated" && (
        <div className="md:hidden border-t border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
          {navItems.map((item) => {
            if (item.requiresAdmin && !isAdmin) return null;
            return (
              <Link key={item.href} href={item.href} className="block text-sm text-slate-700 hover:text-slate-900 py-2">
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
