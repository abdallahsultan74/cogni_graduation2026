"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { patchSystemSettingsAction } from "@/lib/actions/admin.action";

export default function AdminSettingsClient({
  token,
  initialGeneral,
  initialAi,
}: {
  token: string;
  initialGeneral: { systemName?: string; academicYear?: string; defaultCreditLimit?: number };
  initialAi: { aiModelStatus?: string; gpaWarningThreshold?: number };
}) {
  const [pending, startTransition] = useTransition();
  const [general, setGeneral] = useState(initialGeneral);
  const [ai, setAi] = useState(initialAi);

  const save = () => {
    startTransition(async () => {
      const res = await patchSystemSettingsAction(token, { general, aiEngine: ai });
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("Settings saved");
    });
  };

  return (
    <div className="max-w-xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <h2 className="font-semibold">General</h2>
        <Input placeholder="System name" value={general.systemName ?? ""} onChange={(e) => setGeneral({ ...general, systemName: e.target.value })} />
        <Input placeholder="Academic year" value={general.academicYear ?? ""} onChange={(e) => setGeneral({ ...general, academicYear: e.target.value })} />
        <Input type="number" placeholder="Default credit limit" value={general.defaultCreditLimit ?? 21} onChange={(e) => setGeneral({ ...general, defaultCreditLimit: Number(e.target.value) })} />
      </div>
      <div className="space-y-3">
        <h2 className="font-semibold">AI Engine</h2>
        <Input placeholder="AI status" value={ai.aiModelStatus ?? ""} onChange={(e) => setAi({ ...ai, aiModelStatus: e.target.value })} />
        <Input type="number" step="0.1" placeholder="GPA warning threshold" value={ai.gpaWarningThreshold ?? 2.5} onChange={(e) => setAi({ ...ai, gpaWarningThreshold: Number(e.target.value) })} />
      </div>
      <Button onClick={save} disabled={pending}>Save Settings</Button>
    </div>
  );
}
