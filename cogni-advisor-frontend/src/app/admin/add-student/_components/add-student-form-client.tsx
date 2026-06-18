"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStudentAction } from "@/lib/actions/admin.action";

export default function AddStudentFormClient({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [created, setCreated] = useState<{
    university_student_id?: string;
    university_email?: string;
  } | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    national_id: "",
    personal_email: "",
    password: "",
    gender: "male",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createStudentAction(token, form);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      const user = res.data as {
        student?: { university_student_id?: string };
        university_email?: string;
      };
      setCreated({
        university_student_id: user.student?.university_student_id,
        university_email: user.university_email,
      });
      toast.success("Student created");
    });
  };

  if (created) {
    return (
      <div className="max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Student created</h2>
        {created.university_student_id ? (
          <p className="text-sm text-slate-600">
            Student ID: <strong>{created.university_student_id}</strong>
          </p>
        ) : null}
        {created.university_email ? (
          <p className="text-sm text-slate-600">
            University email: <strong>{created.university_email}</strong>
          </p>
        ) : null}
        <Button onClick={() => router.push("/admin/users")} className="w-full">
          Go to users
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
      <Input placeholder="Middle name (optional)" value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
      <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
      <Input placeholder="National ID (14 digits)" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} required />
      <Input type="email" placeholder="Personal email (Gmail, etc.)" value={form.personal_email} onChange={(e) => setForm({ ...form, personal_email: e.target.value })} required />
      <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating..." : "Create Student"}
      </Button>
    </form>
  );
}
