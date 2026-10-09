"use client";

import { Search, X } from "lucide-react";

interface LiveSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LiveSearch({
  value,
  onChange,
  placeholder = "Cari data...",
  className = "",
}: LiveSearchProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
        <Search className="h-4 w-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-md border border-input bg-background py-2 pr-8 pl-9 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-150 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground focus:outline-hidden"
          aria-label="Hapus kata kunci pencarian"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
