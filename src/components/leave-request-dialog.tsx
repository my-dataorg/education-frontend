"use client";

import { useState } from "react";

export type LeaveAttachment = {
  id: string;
  name: string;
  contentType: string;
  dataUrl: string;
};

type Props = {
  instituteId: string;
  sectionId?: string;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
};

export function LeaveRequestDialog({ instituteId, sectionId, open, onClose, onSubmitted }: Props) {
  const [purpose, setPurpose] = useState("");
  const [body, setBody] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [attachments, setAttachments] = useState<LeaveAttachment[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function onUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Only image attachments are supported");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
    setAttachments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: file.name, contentType: file.type, dataUrl },
    ]);
  }

  async function submit() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/institutes/${instituteId}/leave-requests`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionId: sectionId || null,
        startDate,
        endDate,
        purpose,
        body,
        attachments,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const detail = data.detail;
      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(", ")
            : data.error || "Could not submit leave request"
      );
      return;
    }
    setPurpose("");
    setBody("");
    setAttachments([]);
    onSubmitted();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg">
        <h2 className="text-lg font-semibold">Apply for leave</h2>
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-muted-foreground">Purpose</span>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              maxLength={200}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Details</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              <span className="text-muted-foreground">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-muted-foreground">Attachment (optional image)</span>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file).catch(() => setError("Upload failed"));
                e.target.value = "";
              }}
            />
          </label>
          {attachments.length > 0 && (
            <p className="text-xs text-muted-foreground">{attachments.length} file(s) attached</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !purpose.trim()}
            onClick={() => submit()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
