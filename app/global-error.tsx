"use client";

import Image from "next/image";
import Link from "next/link";

// Global error boundary for all 5xx-style unhandled errors in the App Router.
// Must render html/body because it replaces the root layout when triggered.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-500">Something went wrong</p>
          <h1 className="text-2xl font-semibold text-slate-900">What is happening?</h1>
          <p className="text-sm text-slate-600">
            An unexpected error occurred. You can try again or head back home.
          </p>
          <div className="flex justify-center">
            <Image
              src="/images/what-is-happening.jpg"
              alt="Error"
              width={640}
              height={426}
              className="h-auto max-h-64 w-auto rounded"
              sizes="(max-width: 1024px) 90vw, 640px"
              priority
            />
          </div>
          {error?.digest && (
            <p className="text-xs text-slate-400">Error id: {error.digest}</p>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 pt-2">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
