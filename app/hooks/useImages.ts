"use client";

import { useQuery } from "@tanstack/react-query";
import type { ImageItem } from "@/app/types";

type ImagesResponse = {
  success?: boolean;
  items?: ImageItem[];
  lastEvaluatedKey?: { imageId: string };
  error?: string;
};

type UseImagesOptions = {
  pageSize?: number;
  startKey?: string;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
};

export function useImages({
  pageSize = 10,
  startKey,
  enabled = true,
  staleTime = 60_000,
  gcTime = 5 * 60_000,
}: UseImagesOptions = {}) {
  return useQuery({
    queryKey: ["images", { pageSize, startKey }],
    queryFn: async (): Promise<ImagesResponse> => {
      const params = new URLSearchParams();
      if (pageSize) params.set("pageSize", String(pageSize));
      if (startKey) params.set("startKey", startKey);

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
  });
}
