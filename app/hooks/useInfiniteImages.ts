"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { ImageItem } from "@/app/types";

export type ImagesResponse = {
  success?: boolean;
  items?: ImageItem[];
  lastEvaluatedKey?: { imageId: string };
  error?: string;
};

type UseInfiniteImagesOptions = {
  pageSize?: number; // default 3
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
};

export function useInfiniteImages({
  pageSize = 3,
  enabled = true,
  staleTime = 60_000,
  gcTime = 5 * 60_000,
}: UseInfiniteImagesOptions = {}) {
  return useInfiniteQuery({
    queryKey: ["images-infinite", { pageSize }],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("pageSize", String(pageSize));
      if (pageParam?.imageId) params.set("startKey", String(pageParam.imageId));

      const res = await fetch(`/api/images?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as ImagesResponse;
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `Failed to load images (${res.status})`);
      }
      return data;
    },
    enabled,
    staleTime,
    gcTime,
    getNextPageParam: (lastPage) => lastPage?.lastEvaluatedKey ?? undefined,
    initialPageParam: undefined as { imageId: string } | undefined,
  });
}
