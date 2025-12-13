"use client";

import { useState } from "react";
import Modal from "../components/Modal";

type ImageItem = {
  imageId: string;
  title?: string;
  description?: string;
  tags?: string[];
  url?: string;
  thumbnailUrl?: string;
};

export default function ImageCard({ item }: { item: ImageItem }) {
  const [open, setOpen] = useState(false);
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const src = item.url || item.thumbnailUrl;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {item.title && (
        <div className="mb-3 text-base font-semibold text-slate-900 truncate" title={item.title}>
          {item.title}
        </div>
      )}

      {src ? (
        <button onClick={() => setOpen(true)} className="mb-3">
          <img
            src={src}
            alt={item.description || "Image"}
            className="h-48 w-full rounded-xl object-cover"
          />
        </button>
      ) : null}

      {item.description && (
        <p className="mb-3 text-sm text-slate-700 whitespace-pre-line">{item.description}</p>
      )}

      {tags.length > 0 ? (
        <div className="mt-auto flex flex-wrap gap-2">
          {tags.map((t, i) => (
            <span
              key={`${item.imageId}-tag-${i}`}
              className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
            >
              {t}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-500">No tags</div>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={item.title || "Image"}
        description={item.description}
      >
        {src ? (
          <img src={src} alt={item.description || "Image"} className="max-h-[70vh] w-full object-contain" />
        ) : null}
      </Modal>
    </div>
  );
}