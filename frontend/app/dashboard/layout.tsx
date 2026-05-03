import DashboardLayoutRouter from "@/components/dashboard/DashboardLayoutRouter";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutRouter>{children}</DashboardLayoutRouter>;
}
