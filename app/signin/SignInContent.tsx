"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FaDiscord, FaGithub, FaFacebook } from "react-icons/fa";

export default function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  let errorMessage = null;
  if (error === "AccessDenied") {
    errorMessage = "Your account does not have a public email address. Please add a public email to your profile and try again.";
  }

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Sign In</h1>
          <p className="mt-2 text-sm text-slate-600">
            Choose a provider to sign in and access your account.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <button
            onClick={() => signIn("github", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            <FaGithub className="w-5 h-5" />
            Sign in with GitHub
          </button>

          <button
            onClick={() => signIn("facebook", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            <FaFacebook className="w-5 h-5" />
            Sign in with Facebook
          </button>

          <button
            onClick={() => signIn("discord", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            <FaDiscord className="w-5 h-5" />
            Sign in with Discord
          </button>
        </div>
      </div>
    </div>
  );
}
