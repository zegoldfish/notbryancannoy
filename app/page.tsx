import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { SignInButton } from "@app/components/SignInButton";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">
            {session ? `Welcome, ${session.user?.name || "User"}` : "Welcome"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {session ? "You're signed in and ready to go." : "Sign in to continue."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {session ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-700">
                You are signed in as {session.user?.email}.
              </p>
              <a
                href="/api/auth/signout"
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                Sign out
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-700">
                Sign in to access your account and start using the platform.
              </p>
              <SignInButton size="lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
