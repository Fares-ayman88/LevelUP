"use client";

import { useState, useActionState, useEffect } from "react";
import { MessageSquare, Send, Sparkles, Wifi, WifiOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { defaultCommunicationTemplates, generateWhatsAppLink, interpolateTemplate } from "@/lib/communications/communication-utils";
import { sendWahaMessageAction, type SendMessageActionState } from "@/app/actions/communications";

const initialState: SendMessageActionState = { success: false };

export function CommunicationCenter() {
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultCommunicationTemplates[0].id);
  const [phone, setPhone] = useState("");
  const [studentName, setStudentName] = useState("أحمد محمد");
  const [guardianName, setGuardianName] = useState("محمد أحمد");
  const [subjectName, setSubjectName] = useState("الفيزياء");
  const [groupName, setGroupName] = useState("مجموعة أ");
  const [amount, setAmount] = useState("400 EGP");
  const [customMessage, setCustomMessage] = useState("");
  const [wahaConnected, setWahaConnected] = useState<boolean | null>(null);

  const [sendState, sendAction, isSending] = useActionState(sendWahaMessageAction, initialState);

  // Check WAHA connection status on mount
  useEffect(() => {
    async function checkWahaStatus() {
      try {
        const response = await fetch("/api/waha/status");
        if (response.ok) {
          const data = await response.json();
          setWahaConnected(data.connected === true);
        } else {
          setWahaConnected(false);
        }
      } catch {
        setWahaConnected(false);
      }
    }

    checkWahaStatus();
  }, []);

  const currentTemplate = defaultCommunicationTemplates.find((t) => t.id === selectedTemplateId) ?? defaultCommunicationTemplates[0];

  const rawMessage = customMessage || currentTemplate.content;
  const previewMessage = interpolateTemplate(rawMessage, {
    amount,
    group_name: groupName,
    guardian_name: guardianName,
    student_name: studentName,
    subject_name: subjectName,
  });

  const waLink = phone ? generateWhatsAppLink(phone, previewMessage) : "#";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Configuration Form */}
      <div className="border border-white/10 bg-white/[0.025] p-5 space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-white">اختر النموذج (Select Template)</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {defaultCommunicationTemplates.map((template) => (
              <button
                className={[
                  "px-3 py-2 text-xs font-semibold border transition-colors",
                  selectedTemplateId === template.id
                    ? "border-[#9db2ff] bg-[#9db2ff]/15 text-[#9db2ff]"
                    : "border-white/10 bg-black/20 text-slate-400 hover:text-white",
                ].join(" ")}
                key={template.id}
                onClick={() => {
                  setSelectedTemplateId(template.id);
                  setCustomMessage("");
                }}
                type="button"
              >
                {template.title}
              </button>
            ))}
          </div>
        </div>

        {/* Variables Inputs */}
        <div className="space-y-3 pt-3 border-t border-white/8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">بيانات التخصيص (Variables)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-300">رقم الهاتف (Mobile)</label>
              <input
                className="mt-1 h-9 w-full border border-white/10 bg-black/20 px-3 text-xs text-white outline-none focus:border-[#9db2ff]/60"
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                value={phone}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">اسم الطالب (Student)</label>
              <input
                className="mt-1 h-9 w-full border border-white/10 bg-black/20 px-3 text-xs text-white outline-none focus:border-[#9db2ff]/60"
                onChange={(e) => setStudentName(e.target.value)}
                value={studentName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">اسم المادة (Subject)</label>
              <input
                className="mt-1 h-9 w-full border border-white/10 bg-black/20 px-3 text-xs text-white outline-none focus:border-[#9db2ff]/60"
                onChange={(e) => setSubjectName(e.target.value)}
                value={subjectName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">المجموعة (Group)</label>
              <input
                className="mt-1 h-9 w-full border border-white/10 bg-black/20 px-3 text-xs text-white outline-none focus:border-[#9db2ff]/60"
                onChange={(e) => setGroupName(e.target.value)}
                value={groupName}
              />
            </div>
          </div>
        </div>

        {/* Message Editor */}
        <div className="pt-3 border-t border-white/8">
          <label className="block text-xs font-medium text-slate-300 mb-1">نص الرسالة (Message Body)</label>
          <textarea
            className="w-full h-32 border border-white/10 bg-black/20 p-3 text-xs text-white outline-none focus:border-[#9db2ff]/60"
            onChange={(e) => setCustomMessage(e.target.value)}
            value={rawMessage}
          />
        </div>
      </div>

      {/* Preview & Dispatch Card */}
      <div className="border border-white/10 bg-white/[0.025] p-5 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between border-b border-white/8 pb-3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#9db2ff]">
              <Sparkles size={15} />
              معاينة الرسالة (Message Preview)
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{previewMessage.length} characters</span>
              {/* WAHA Connection Status Indicator */}
              {wahaConnected !== null && (
                <span
                  className={[
                    "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 border",
                    wahaConnected
                      ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                      : "border-amber-500/30 bg-amber-950/20 text-amber-400",
                  ].join(" ")}
                  title={wahaConnected ? "WAHA connected — ready to send" : "WAHA disconnected — use WhatsApp Web link"}
                >
                  {wahaConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {wahaConnected ? "WAHA" : "Offline"}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 font-arabic text-sm leading-7 text-emerald-100 dir-rtl">
            <p className="whitespace-pre-wrap">{previewMessage}</p>
          </div>
        </div>

        {/* Delivery Status Toast */}
        {sendState.success && (
          <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-400">
            <CheckCircle2 size={14} />
            تم إرسال الرسالة بنجاح (Message sent successfully)
          </div>
        )}
        {sendState.error && !sendState.success && (
          <div className="flex items-center gap-2 border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs text-red-400">
            <XCircle size={14} />
            {sendState.error}
          </div>
        )}

        <div className="space-y-3 pt-4 border-t border-white/8">
          {/* Direct Send via WAHA */}
          {phone && wahaConnected && (
            <form action={sendAction}>
              <input name="phone" type="hidden" value={phone} />
              <input name="message" type="hidden" value={previewMessage} />
              <button
                className="flex h-11 w-full items-center justify-center gap-2 bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSending}
                type="submit"
              >
                {isSending ? (
                  <>
                    <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                    جاري الإرسال... (Sending...)
                  </>
                ) : (
                  <>
                    <Send aria-hidden="true" size={16} />
                    إرسال مباشر عبر WAHA (Send directly via WAHA)
                  </>
                )}
              </button>
            </form>
          )}

          {/* Fallback: WhatsApp Web Link */}
          {phone ? (
            <a
              aria-label="Send via WhatsApp Web"
              className={[
                "flex h-11 w-full items-center justify-center gap-2 px-4 text-sm font-semibold transition",
                wahaConnected
                  ? "border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white"
                  : "bg-emerald-600 text-white hover:bg-emerald-500",
              ].join(" ")}
              href={waLink}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MessageSquare aria-hidden="true" size={16} />
              {wahaConnected
                ? "إرسال عبر واتساب ويب (Send via WhatsApp Web)"
                : "إرسال عبر واتساب (Send via WhatsApp)"}
            </a>
          ) : (
            <button
              className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-500"
              disabled
              type="button"
            >
              <MessageSquare aria-hidden="true" size={16} />
              أدخل رقم الهاتف لتفعيل زر الواتساب
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
