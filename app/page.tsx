import { getServerSession } from "next-auth"
import Link from "next/link"

import { authOptions } from "@/auth"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  return (
    <div className="max-w-2xl w-full space-y-4">
      {session ? (
        <>
          <h1 className="text-3xl font-bold">Welcome, {session.user?.name ?? "friend"}</h1>
          {session.user?.email && <p className="text-lg">Email: {session.user.email}</p>}

          {/* Debug: Show all session data */}
          <details className="bg-gray-900 text-white p-4 rounded text-left mt-4">
            <summary className="cursor-pointer font-semibold hover:text-gray-300">
              🔍 View full session data
            </summary>
            <pre className="mt-2 text-xs overflow-auto bg-black p-3 rounded">
              {JSON.stringify(session, null, 2)}
            </pre>
          </details>

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
            href="/signin"
            className="inline-block rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Sign in
          </Link>
        </>
      )}
    </div>
  )
}