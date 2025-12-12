type UserRecord = {
  email?: string;
  isAdmin?: boolean;
};

interface UserTableProps {
  users: UserRecord[];
  loading: boolean;
}

export default function UserTable({ users, loading }: UserTableProps) {
  if (loading) {
    return <p className="text-sm text-slate-500">Loading users...</p>;
  }

  if (!users.length) {
    return <p className="text-sm text-slate-500">No users found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-100">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Email</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {users.map((user, index) => (
            <tr key={index} className="transition hover:bg-slate-50">
              <td className="px-4 py-3 text-sm text-slate-900">{user.email}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    user.isAdmin
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                  }`}
                >
                  {user.isAdmin ? "Admin" : "User"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}