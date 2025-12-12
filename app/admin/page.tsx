"use client";

import { AdminGuard } from "./AdminGuard";
import { useUsers } from "@/app/admin/hooks/useUsers";
import UserTable from "./users/UserTable";

export default function AdminPage() {
  const { data: users = [], isLoading: loading, error } = useUsers();

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Users</h1>
            <p className="text-slate-600">View current users from DynamoDB.</p>
          </div>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error.message}
          </div>
        )}

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
      </div>
      </div>
    </AdminGuard>
  );
}
