"use client";

import { useEffect, useState } from "react";
import { QrCode, RefreshCw, ShieldCheck, Timer } from "lucide-react";

type QrSessionAttendanceProps = {
  groupName: string;
  sessionId: string;
  subjectName: string;
};

export function QrSessionAttendance({ groupName, sessionId, subjectName }: QrSessionAttendanceProps) {
  const [qrToken, setQrToken] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [loading, setLoading] = useState(false);

  const fetchToken = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/qr-token?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setQrToken(data.token);
        setTimeLeft(30);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, [sessionId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const qrDataString = qrToken ? JSON.stringify(qrToken) : "";
  // Generate SVG QR matrix using Google Charts or public QR SVG URL encoder
  const qrImageUrl = qrDataString
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrDataString)}&color=0d65ff&bgcolor=ffffff`
    : "";

  return (
    <div className="border border-white/10 bg-white/[0.025] p-6 text-center shadow-xl">
      <div className="mb-4">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db2ff]">{subjectName}</span>
        <h3 className="mt-1 text-xl font-semibold text-white">{groupName} — Dynamic QR Attendance</h3>
        <p className="mt-1 text-xs text-slate-400">Students scan this QR code using their LevelUp app to record attendance.</p>
      </div>

      <div className="relative mx-auto my-6 grid h-64 w-64 place-items-center rounded-2xl border border-white/10 bg-white p-3 shadow-2xl">
        {qrImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="Session Attendance QR Code" className="h-full w-full object-contain" src={qrImageUrl} />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <QrCode className="animate-pulse" size={48} />
            <span className="text-xs font-medium">Generating QR...</span>
          </div>
        )}

        {/* Scan line effect */}
        <div className="pointer-events-none absolute inset-x-4 top-4 h-1 rounded-full bg-gradient-to-r from-transparent via-[#28c7ff] to-transparent opacity-80 animate-bounce" />
      </div>

      <div className="flex items-center justify-center gap-4 text-xs font-semibold">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#9db2ff]/30 bg-[#9db2ff]/10 px-3 py-1 text-[#b9c6ff]">
          <Timer aria-hidden="true" size={14} />
          Refreshes in {timeLeft}s
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-300 transition hover:border-white/25 hover:text-white disabled:opacity-50"
          disabled={loading}
          onClick={fetchToken}
          type="button"
        >
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} size={13} />
          Refresh now
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 border-t border-white/8 pt-4">
        <ShieldCheck aria-hidden="true" className="text-emerald-400" size={15} />
        Cryptographically signed & anti-screenshot security active (30s expiration).
      </div>
    </div>
  );
}
