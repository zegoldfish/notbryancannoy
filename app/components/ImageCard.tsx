"use client";

import Image from "next/image";
import { useState } from "react";
import { deleteImage } from "@app/images/actions";
import Modal from "@app/components/Modal";
import ConfirmationModal from "@app/components/ConfirmationModal";

type ImageItem = {
  imageId: string;
  userId?: string;
  title?: string;
  description?: string;
  tags?: string[];
  url?: string;
  thumbnailUrl?: string;
};

type Props = {
  item: ImageItem;
  canDelete?: boolean;
};

export default function ImageCard({ item, canDelete = false }: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const src = item.url || item.thumbnailUrl;

  if (deleted) return null;

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteImage(item.imageId);
      if (result?.error) {
        setError(result.error);
      } else {
        setDeleted(true);
      }
    } catch (err) {
      console.error("delete image error", err);
      setError("Failed to delete image");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        {item.title ? (
          <div className="text-base font-semibold text-slate-900 line-clamp-2" title={item.title}>
            {item.title}
          </div>
        ) : (
          <div className="text-base font-semibold text-slate-900">&nbsp;</div>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            disabled={deleting}
            className="self-start inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>

      {src ? (
        <button onClick={() => setOpen(true)} className="mb-3 overflow-hidden rounded-xl">
          <div className="relative h-52 w-full sm:h-56">
            <Image
              src={src}
              alt={item.description || "Image"}
              fill
              className="rounded-xl object-cover"
              sizes="(min-width: 640px) 24rem, 100vw"
              unoptimized
            />
          </div>
        </button>
      ) : null}

      {item.description && (
        <p className="mb-3 text-sm text-slate-700 whitespace-pre-line line-clamp-3">{item.description}</p>
      )}

      {error && (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
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
          <div className="relative w-full" style={{ minHeight: "50vh", maxHeight: "70vh" }}>
            <Image
              src={src}
              alt={item.description || "Image"}
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmationModal
        open={showConfirmDelete}
        onOpenChange={setShowConfirmDelete}
        title="Delete image?"
        confirmText="Delete"
        cancelText="Keep it"
        isDangerous
        isLoading={deleting}
        onConfirm={handleDelete}
      >
        This action cannot be undone.
      </ConfirmationModal>
    </div>
  );
}