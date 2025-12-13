import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { listImages } from "@app/images/actions";
import ImageCard from "@app/components/ImageCard";
import { Unauthorized } from "@app/components/Unauthorized";
import type { ImageItem } from "@/app/types";

export default async function MediaPage() {
    const session = await getServerSession(authOptions);
    
    if (!session) {
        return (
            <Unauthorized />
        );
    }

    const sessionUserId = session.user?.email || session.user?.name || "";

    const result = await listImages();

    if ("error" in result) {
        return (
            <div className="min-h-screen bg-slate-50 py-16 px-4">
                <div className="mx-auto max-w-3xl">
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
                        <h1 className="text-xl font-semibold">Failed to load images</h1>
                        <p className="mt-2 text-sm">{result.error}</p>
                    </div>
                </div>
            </div>
        );
    }

    const items = result.items || [];

    return (
        <div className="min-h-screen bg-slate-50 py-16 px-4">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-semibold text-slate-900">Your Media</h1>
                    <p className="mt-2 text-sm text-slate-600">Browse uploaded images with their tags and descriptions.</p>
                </div>

                {items.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
                        No images found.
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {items.map((item: ImageItem) => (
                            <ImageCard
                                key={item.imageId}
                                item={item}
                                canDelete={Boolean(session.user?.isAdmin || (sessionUserId && item.userId === sessionUserId))}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}