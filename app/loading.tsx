// deslop-ignore-file
export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs font-medium text-muted-foreground">Memuat antarmuka inventaris...</p>
      </div>
    </div>
  );
}
