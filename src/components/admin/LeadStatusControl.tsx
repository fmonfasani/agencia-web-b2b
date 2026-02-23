"use client";

import { useState, useTransition } from "react";

const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];

interface LeadStatusControlProps {
  leadId: string;
  initialStatus: string;
  locale: string;
  canEdit: boolean;
}

export default function LeadStatusControl({
  leadId,
  initialStatus,
  locale,
  canEdit,
}: LeadStatusControlProps) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canEdit) {
    return <span className="text-xs text-slate-400">Solo lectura</span>;
  }

  const onStatusChange = (nextStatus: string) => {
    if (nextStatus === status) return;

    const previousStatus = status;
    setStatus(nextStatus);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/${locale}/api/leads/${leadId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });

        if (!response.ok) {
          throw new Error("No se pudo actualizar el estado");
        }
      } catch (updateError) {
        console.error(updateError);
        setStatus(previousStatus);
        setError("No se pudo guardar");
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <select
        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
        value={status}
        disabled={isPending}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        {LEAD_STATUSES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  );
}
