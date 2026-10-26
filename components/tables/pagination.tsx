"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Fungsi penentu daftar nomor halaman yang tampil
  const getPageNumbers = () => {
    const delta = 1;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= safeTotalPages; i++) {
      if (
        i === 1 ||
        i === safeTotalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (typeof i === "number" && i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (typeof i === "number" && i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      if (typeof i === "number") l = i;
    }

    return rangeWithDots;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border/80 px-4 py-3 sm:flex-row">
      {/* Informasi Baris Data & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div>
          Menampilkan <span className="font-semibold text-foreground">{startItem}</span> -{" "}
          <span className="font-semibold text-foreground">{endItem}</span> dari{" "}
          <span className="font-semibold text-foreground">{totalItems}</span> data
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-border pl-3">
            <label htmlFor="pagination-page-size" className="text-muted-foreground">
              Baris per hal:
            </label>
            <select
              id="pagination-page-size"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1); // Reset ke halaman pertama saat ganti ukuran
              }}
              className="rounded border border-input bg-background px-2 py-0.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigasi Tombol Paginasi */}
      <nav aria-label="Navigasi Halaman" className="flex items-center gap-1">
        {/* Tombol Pertama */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          aria-label="Ke halaman pertama"
          title="Ke halaman pertama"
          className="flex h-7 w-7 items-center justify-center rounded border border-input bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>

        {/* Tombol Sebelumnya */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Halaman sebelumnya"
          title="Halaman sebelumnya"
          className="flex h-7 w-7 items-center justify-center rounded border border-input bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {/* Nomor-nomor Halaman */}
        <div className="flex items-center gap-1 px-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs text-muted-foreground select-none"
                >
                  …
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-7 min-w-[28px] items-center justify-center rounded px-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-input bg-card text-foreground hover:bg-muted"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Tombol Selanjutnya */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= safeTotalPages}
          aria-label="Halaman selanjutnya"
          title="Halaman selanjutnya"
          className="flex h-7 w-7 items-center justify-center rounded border border-input bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Tombol Terakhir */}
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={currentPage >= safeTotalPages}
          aria-label="Ke halaman terakhir"
          title="Ke halaman terakhir"
          className="flex h-7 w-7 items-center justify-center rounded border border-input bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </nav>
    </div>
  );
}
