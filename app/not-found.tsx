import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">404 Not Found</p>
            <h1 className="text-2xl font-semibold text-slate-900">What is happening?</h1>
            <p className="text-sm text-slate-600">
              We couldn't find the page you're looking for.
            </p>
            <div className="flex justify-center">
              <img src="/images/what-is-happening.jpg" alt="404 - Page not found" className="max-h-64 rounded" />
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
