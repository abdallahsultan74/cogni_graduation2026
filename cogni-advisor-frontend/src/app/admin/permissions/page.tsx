import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ShieldCheck } from "lucide-react";

export default async function AdminPermissionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Role Permissions</h1>
        <p className="mt-2 text-slate-500">
          Manage access control and permissions for different user roles.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm md:py-32">
        <ShieldCheck className="mb-4 h-12 w-12 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">Permissions Under Construction</h2>
        <p className="mt-2 max-w-md text-center text-slate-500">
          The role permissions interface is currently being developed. You will soon be able to
          customize what advisors and students can access.
        </p>
      </div>
    </div>
  );
}
