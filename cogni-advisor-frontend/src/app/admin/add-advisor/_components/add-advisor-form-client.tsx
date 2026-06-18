"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAdvisorAction } from "@/lib/actions/admin.action";

export default function AddAdvisorFormClient({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    national_id: "",
    password: "",
    gender: "male",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createAdvisorAction(token, form);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("Advisor created");
      router.push("/admin/advisors");
    });
  };

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
      <Input placeholder="Middle name (optional)" value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
      <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
      <Input placeholder="National ID (14 digits)" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} required />
      <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating..." : "Create Advisor"}
      </Button>
    </form>
  );
}
