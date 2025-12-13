import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Unauthorized } from "@app/components/Unauthorized";
import { SignOutButton } from "@app/components/SignOutButton";

export default async function UserPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return (
            <Unauthorized />
        );
    }
    
    return (
        <>
            <div className="min-h-screen bg-slate-50 py-16 px-4">
                <div className="mx-auto max-w-xl">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-semibold text-slate-900">
                            User Profile
                        </h1>
                        <p className="mt-2 text-sm text-slate-600">
                            Manage your account details and preferences.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-700">
                            Name: {session.user?.name || "N/A"}
                        </p>
                        <p className="text-sm text-slate-700">
                            Email: {session.user?.email || "N/A"}
                        </p>
                    </div>
                </div>
                <div className="mx-auto max-w-xl mt-6 text-center">
                    <SignOutButton size="md" />
                    
                </div>
            </div>
        </>
    );
}