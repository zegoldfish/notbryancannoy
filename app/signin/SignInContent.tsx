"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FaDiscord, FaGithub, FaFacebook } from "react-icons/fa";

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  let errorMessage = null;
  if (error === "AccessDenied") {
    errorMessage = "Your GitHub account does not have a public email address. Please add a public email to your GitHub profile and try again.";
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-3xl font-bold text-center">Sign In</h1>
        {errorMessage && (
          <div className="bg-red-100 text-red-800 p-3 rounded text-center font-medium">
            {errorMessage}
          </div>
        )}

        <button
          onClick={() => signIn("github", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 rounded bg-gray-800 px-4 py-3 text-white hover:bg-gray-900 font-semibold"
        >
          <FaGithub className="w-5 h-5" />
          Sign in with GitHub
        </button>

        <button
          onClick={() => signIn("facebook", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 font-semibold"
        >
          <FaFacebook className="w-5 h-5" />
          Sign in with Facebook
        </button>

        <button
          onClick={() => signIn("discord", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 rounded bg-indigo-600 px-4 py-3 text-white hover:bg-indigo-700 font-semibold"
        >
          <FaDiscord className="w-5 h-5" />
          Sign in with Discord
        </button>
      </div>
    </main>
  );
}

export default SignInContent;
