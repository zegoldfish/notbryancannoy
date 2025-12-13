import Image from "next/image";
import type { ReactNode } from "react";
import { SignInButton } from "@app/components/SignInButton";

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
              <Image
                src="/images/ah-ah-ah.gif"
                alt="Unauthorized"
                width={480}
                height={270}
                className="h-auto w-full max-w-2xl rounded object-contain"
                sizes="(max-width: 1024px) 90vw, 640px"
                priority
              />
            </div>
            <SignInButton href={ctaHref} label={ctaLabel} size="lg" className="px-4 py-2" />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
