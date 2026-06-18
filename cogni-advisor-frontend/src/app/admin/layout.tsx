import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminLayoutShell from "./_components/admin-layout-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  const adminName =
    [session.user.firstName, session.user.lastName].join(" ").trim() ||
    session.user.name ||
    "Admin";

  return (
    <AdminLayoutShell
      adminName={adminName}
      email={session.user.email ?? undefined}
    >
      {children}
    </AdminLayoutShell>
  );
}
