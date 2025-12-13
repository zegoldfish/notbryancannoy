"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function Modal({ open, onOpenChange, title, description, children, footer }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl focus:outline-none">
          {title ? (
            <Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title>
          ) : null}
          {description ? (
            <Dialog.Description className="mt-1 text-sm text-slate-600">{description}</Dialog.Description>
          ) : null}

          <div className="mt-3">{children}</div>

          {footer ? <div className="mt-4 flex justify-end gap-2">{footer}</div> : null}

          <Dialog.Close asChild>
            <button
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
