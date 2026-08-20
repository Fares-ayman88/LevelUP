"use client";

import { CheckCircle2, LoaderCircle, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MAX_PROFILE_PHOTO_BYTES, PROFILE_PHOTO_CONTENT_TYPES } from "@/lib/media/profile-photo-rules";

type UploadState = {
  kind: "idle" | "error" | "success";
  message?: string;
};

type UploadPreparation = {
  assetId: string;
  uploadHeaders: Record<string, string>;
  uploadUrl: string;
};

export function TeacherProfilePhotoUploader({ storageConfigured }: { storageConfigured: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<UploadState>({ kind: "idle" });

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!PROFILE_PHOTO_CONTENT_TYPES.includes(file.type as (typeof PROFILE_PHOTO_CONTENT_TYPES)[number]) || file.size > MAX_PROFILE_PHOTO_BYTES) {
      setState({ kind: "error", message: "Choose a JPG, PNG, WebP, or AVIF image under 5 MB." });
      event.target.value = "";
      return;
    }

    setPending(true);
    setState({ kind: "idle" });

    try {
      const prepareResponse = await fetch("/api/teacher/profile-photo/upload", {
        body: JSON.stringify({ byteSize: file.size, contentType: file.type }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const prepare = await prepareResponse.json() as UploadPreparation & { error?: string };
      if (!prepareResponse.ok) throw new Error(prepare.error ?? "Could not prepare the image upload.");

      const uploadResponse = await fetch(prepare.uploadUrl, {
        body: file,
        headers: prepare.uploadHeaders,
        method: "PUT",
      });
      if (!uploadResponse.ok) throw new Error("The image upload did not finish. Please try again.");

      const completeResponse = await fetch("/api/teacher/profile-photo/complete", {
        body: JSON.stringify({ assetId: prepare.assetId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const complete = await completeResponse.json() as { error?: string };
      if (!completeResponse.ok) throw new Error(complete.error ?? "Could not verify the uploaded image.");

      setState({ kind: "success", message: "Profile photo updated." });
      router.refresh();
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not update the profile photo.",
      });
    } finally {
      setPending(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input accept={PROFILE_PHOTO_CONTENT_TYPES.join(",")} className="sr-only" disabled={!storageConfigured || pending} onChange={handleChange} ref={inputRef} type="file" />
      <button
        className="inline-flex h-10 items-center gap-2 bg-[#9db2ff] px-4 text-sm font-semibold text-[#0a0c12] transition hover:bg-[#b6c5ff] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!storageConfigured || pending}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Upload aria-hidden="true" size={16} />}
        {pending ? "Uploading" : "Update photo"}
      </button>
      {!storageConfigured && <p className="text-xs leading-5 text-amber-200">Photo uploads are not configured for this environment.</p>}
      {state.message && (
        <p className={state.kind === "error" ? "text-xs leading-5 text-rose-300" : "flex items-center gap-2 text-xs leading-5 text-emerald-200"} role={state.kind === "error" ? "alert" : "status"}>
          {state.kind === "success" && <CheckCircle2 aria-hidden="true" size={15} />}
          {state.message}
        </p>
      )}
    </div>
  );
}
