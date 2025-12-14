"use client";

import { useEffect, useState } from "react";
import ImageCard from "@app/components/ImageCard";
import { Unauthorized } from "@app/components/Unauthorized";
import type { ImageItem } from "@/app/types";
import { useUser } from "@context/UserContext";

export default function MediaPage() {
    const { session, status } = useUser();
    const [items, setItems] = useState<ImageItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (status !== "authenticated") return;
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/images", { cache: "no-store" });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data?.error || `Failed to load images (${res.status})`);
                }
                const data = await res.json();
                if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : "Failed to load images";
                if (!cancelled) setError(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [status]);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-slate-50 py-16 px-4">
                <div className="mx-auto max-w-3xl">Loading...</div>
            </div>
        );
    }

    if (status === "unauthenticated" || !session) {
        return <Unauthorized />;
    }

    const sessionUserId = session.user?.email || session.user?.name || "";
    const isAdmin = Boolean(session.user?.isAdmin);

    return (
        <div className="min-h-screen bg-slate-50 py-16 px-4">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-semibold text-slate-900">Your Media</h1>
                    <p className="mt-2 text-sm text-slate-600">Browse uploaded images with their tags and descriptions.</p>
                </div>

                {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
                        <h1 className="text-xl font-semibold">Failed to load images</h1>
                        <p className="mt-2 text-sm">{error}</p>
                    </div>
                ) : loading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
                        Loading images...
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
                        No images found.
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {items.map((item: ImageItem) => (
                            <ImageCard
                                key={item.imageId}
                                item={item}
                                canDelete={Boolean(isAdmin || (sessionUserId && item.userId === sessionUserId))}
                                canEdit={Boolean(isAdmin || (sessionUserId && item.userId === sessionUserId))}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}