import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar Navigasi Kiri */}
      <DashboardSidebar />

      {/* Area Konten Utama Kanan */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header Atas */}
        <DashboardHeader />

        {/* Konten Halaman */}
        <main className="flex-1 bg-muted/20 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}