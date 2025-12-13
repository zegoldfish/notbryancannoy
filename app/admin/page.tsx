"use client";

import { AdminGuard } from "./AdminGuard";
import { useUsers } from "@/app/admin/hooks/useUsers";
import { addUserAction } from "@/app/admin/actions";
import UserTable from "./users/UserTable";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminPage() {
  const { data: users = [], isLoading: loading, error } = useUsers();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await addUserAction(formData);
    if ("error" in result) {
      setMessage(result.error || "An error occurred");
      setIsError(true);
    } else {
      setMessage("User added successfully!");
      setIsError(false);
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ["users"] });
      // Reset form
      event.currentTarget.reset();
    }
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-600">View and add users with admin access.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            Admin only
          </span>
        </div>

        {message && (
          <div
            className={`rounded border px-4 py-3 text-sm font-medium ${
              isError
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {message}
          </div>
        )}

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error.message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Current Users</h2>
                <p className="text-sm text-slate-500">Synced from DynamoDB.</p>
              </div>
            </header>
            <div className="px-5 py-4">
              <UserTable users={users} loading={loading} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Add New User</h2>
              <p className="text-sm text-slate-500">Grant access by email, choose admin if needed.</p>
            </header>
            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-slate-800">Email address</span>
                <input
                  type="email"
                  name="email"
                  placeholder="user@example.com"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-offset-1 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  name="isAdmin"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Grant admin access
              </label>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Add User
              </button>
            </form>
          </section>
        </div>
      </div>
      </div>
    </AdminGuard>
  );
}
