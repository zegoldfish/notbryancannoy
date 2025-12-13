"use client";

import Image from "next/image";
import Modal from "./Modal";
import { ReactNode } from "react";

type ConfirmationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  isDangerous?: boolean;
  children?: ReactNode;
};

export default function ConfirmationModal({
  open,
  onOpenChange,
  title = "Are you sure?",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  isDangerous = false,
  children,
}: ConfirmationModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const confirmButtonClass = isDangerous
    ? "bg-red-600 hover:bg-red-700 focus-visible:outline-red-500"
    : "bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-500";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${confirmButtonClass}`}
          >
            {isLoading ? "Loading..." : confirmText}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-center">
          <Image
            src="/images/you-sure-about-that.jpg"
            alt="Confirmation"
            width={640}
            height={360}
            className="h-auto max-h-48 w-auto rounded-lg object-cover"
            sizes="(max-width: 768px) 80vw, 320px"
          />
        </div>
        {children && <div className="text-sm text-slate-700">{children}</div>}
      </div>
    </Modal>
  );
}
