"use client";

import { useEffect, useMemo, useRef } from "react";
import ImageCard from "@app/components/ImageCard";
import { Unauthorized } from "@app/components/Unauthorized";
import type { ImageItem } from "@/app/types";
import { useUser } from "@context/UserContext";
import { useInfiniteImages, type ImagesResponse } from "@app/hooks/useInfiniteImages";

export default function MediaPage() {
    const { session, status } = useUser();
    const {
        data,
        isLoading,
        error,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
    } = useInfiniteImages({ enabled: status === "authenticated", pageSize: 3 });

    const itemsList: ImageItem[] = useMemo(() => {
        const pages = (data?.pages || []) as ImagesResponse[];
        return pages.flatMap((p) => p.items || []);
    }, [data]);

    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!hasNextPage) return;
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: "200px" }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, itemsList.length]);

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
                        <p className="mt-2 text-sm">{error instanceof Error ? error.message : String(error)}</p>
                    </div>
                ) : isLoading && itemsList.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
                        Loading images...
                    </div>
                ) : itemsList.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
                        No images found.
                    </div>
                ) : (
                    <>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {itemsList.map((item: ImageItem) => (
                                <ImageCard
                                    key={item.imageId}
                                    item={item}
                                    canDelete={Boolean(isAdmin || (sessionUserId && item.userId === sessionUserId))}
                                    canEdit={Boolean(isAdmin || (sessionUserId && item.userId === sessionUserId))}
                                />
                            ))}
                        </div>
                        <div ref={sentinelRef} />
                        {isFetchingNextPage && (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
                                Loading more...
                            </div>
                        )}
                        {!hasNextPage && itemsList.length > 0 && (
                            <div className="mt-4 text-center text-xs text-slate-500">End of results</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}