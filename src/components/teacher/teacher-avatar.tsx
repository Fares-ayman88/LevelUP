"use client";

import { useState } from "react";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TeacherAvatar({
  className = "h-12 w-12",
  displayName,
  profilePhotoKey,
  teacherProfileId,
}: {
  className?: string;
  displayName: string;
  profilePhotoKey: string | null;
  teacherProfileId: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (profilePhotoKey && !imageFailed) {
    return (
      // The source is an authenticated same-origin route that redirects to a short-lived storage URL.
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={`${displayName} profile photo`} className={`${className} shrink-0 border border-[#9db2ff]/25 object-cover`} onError={() => setImageFailed(true)} src={`/api/media/teacher-photo/${teacherProfileId}`} />
    );
  }

  return (
    <span aria-label={`${displayName} initials`} className={`grid shrink-0 place-items-center border border-[#9db2ff]/25 bg-[#9db2ff]/10 text-sm font-bold text-[#b9c6ff] ${className}`}>
      {initials(displayName)}
    </span>
  );
}
