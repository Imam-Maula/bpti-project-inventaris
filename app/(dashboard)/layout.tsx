import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { requireAuth } from "@/lib/dal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar Navigasi Kiri - Statis & Tetap Diam */}
      <DashboardSidebar role={user.role} name={user.name} />

      {/* Area Tengah & Kanan */}
      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        {/* Header Atas - Statis & Tetap Diam */}
        <DashboardHeader role={user.role} name={user.name} />

        {/* Konten Halaman - Memenuhi sisa tinggi layar tanpa scrollbar pada level halaman */}
        <main className="flex flex-1 flex-col min-h-0 overflow-hidden bg-muted/20 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col min-h-0 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
