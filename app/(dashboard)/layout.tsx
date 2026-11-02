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
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar Navigasi Kiri */}
      <DashboardSidebar role={user.role} name={user.name} />

      {/* Area Konten Utama Kanan */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header Atas */}
        <DashboardHeader role={user.role} name={user.name} />

        {/* Konten Halaman */}
        <main className="flex-1 bg-muted/20 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}