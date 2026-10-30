import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "react-hot-toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1E293B",
            color: "#F8FAFC",
            border: "1px solid #334155",
            fontSize: "14px",
            fontWeight: "bold",
          },
          success: { iconTheme: { primary: "#e8bc69", secondary: "#0F172A" } },
        }}
      />
    </AppShell>
  );
}
