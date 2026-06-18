import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSystemSettingsAction } from "@/lib/actions/admin.action";
import AdminSettingsClient from "./_components/admin-settings-client";

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  const settingsResult = await getSystemSettingsAction(session.accessToken);
  const settings =
    settingsResult.status === "success"
      ? (settingsResult.data as { general?: Record<string, unknown>; aiEngine?: Record<string, unknown> })
      : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">System Settings</h1>
        <p className="mt-2 text-slate-500">Configure global application settings and AI parameters.</p>
      </div>
      {settingsResult.status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{settingsResult.message}</div>
      ) : (
        <AdminSettingsClient
          token={session.accessToken}
          initialGeneral={(settings.general ?? {}) as { systemName?: string; academicYear?: string; defaultCreditLimit?: number }}
          initialAi={(settings.aiEngine ?? {}) as { aiModelStatus?: string; gpaWarningThreshold?: number }}
        />
      )}
    </div>
  );
}
