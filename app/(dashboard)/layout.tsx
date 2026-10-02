export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <header className="mb-6 flex items-center justify-between border-b pb-4">
        <h1 className="text-xl font-bold">Inventaris Aset BPTI UHAMKA</h1>
        <span className="text-sm text-slate-500">Panel Administrator</span>
      </header>
      <main>{children}</main>
    </div>
  );
}