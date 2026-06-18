"use client";

import { useState } from "react";
import { reviewStudyPlanAction } from "@/lib/actions/advisor.action";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StudyPlanReviewClient({ token, planId }: { token: string; planId: number }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReview = async (status: "APPROVED" | "REJECTED") => {
    setIsSubmitting(true);
    setError(null);

    const result = await reviewStudyPlanAction(token, planId, status, feedback);

    if (result.status === "error") {
      setError(result.message);
      setIsSubmitting(false);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Advisor Review</h3>
      
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <textarea
        className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-4"
        rows={3}
        placeholder="Add feedback for the student (Optional for approval, highly recommended for rejection)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        disabled={isSubmitting}
      />

      <div className="flex gap-3 justify-end">
        <button
          onClick={() => handleReview("REJECTED")}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Reject Plan
        </button>
        <button
          onClick={() => handleReview("APPROVED")}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Approve Plan
        </button>
      </div>
    </div>
  );
}
