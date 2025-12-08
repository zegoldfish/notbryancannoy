import { getServerSession } from "next-auth"
import Link from "next/link"

import { authOptions } from "@/auth"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        {session ? (
          <>
            <h1 className="text-3xl font-bold">Welcome, {session.user?.name ?? "friend"}</h1>
            {session.user?.email && <p className="text-lg">Email: {session.user.email}</p>}
            <a
              href="/api/auth/signout"
              className="inline-block rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
            >
              Sign out
            </a>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Welcome</h1>
            <p className="text-lg">Sign in to continue</p>
            <Link
              href="/api/auth/signin"
              className="inline-block rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Sign in with GitHub
            </Link>
          </>
        )}
      </div>
    </main>
  )
}