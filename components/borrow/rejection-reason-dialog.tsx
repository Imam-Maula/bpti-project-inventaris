"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function RejectionReasonDialog({
  borrowCode,
  reason,
}: {
  borrowCode: string;
  reason: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
      >
        Lihat alasan penolakan
      </button>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rejection-reason-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Tutup alasan penolakan"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 cursor-default bg-black/60"
          />
          <section className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-5 text-card-foreground shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="rejection-reason-title" className="font-semibold">
                  Alasan Pengajuan Ditolak
                </h2>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {borrowCode}
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm text-foreground">
              {reason}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
