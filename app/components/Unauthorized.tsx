import type { ReactNode } from "react";

export type UnauthorizedProps = {
  title?: string;
  message?: string;
  ctaHref?: string;
  ctaLabel?: string;
  children?: ReactNode;
};

export function Unauthorized({
  title = "Ah ah ah...",
  message = "You did not say the magic word. Please sign in.",
  ctaHref = "/signin",
  ctaLabel = "Go to sign in",
  children,
}: UnauthorizedProps) {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="p-6 space-y-4 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-600">{message}</p>
            <div className="flex justify-center">
              <img src="/images/ah-ah-ah.gif" alt="Unauthorized" className="max-h-64 rounded" />
            </div>
            <a
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {ctaLabel}
            </a>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
