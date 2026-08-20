"use client";

import { useState } from "react";
import { MessageSquare, Send, Sparkles } from "lucide-react";
import { defaultCommunicationTemplates, generateWhatsAppLink, interpolateTemplate } from "@/lib/communications/communication-utils";

export function CommunicationCenter() {
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultCommunicationTemplates[0].id);
  const [phone, setPhone] = useState("");
  const [studentName, setStudentName] = useState("أحمد محمد");
  const [guardianName, setGuardianName] = useState("محمد أحمد");
  const [subjectName, setSubjectName] = useState("الفيزياء");
  const [groupName, setGroupName] = useState("مجموعة أ");
  const [amount, setAmount] = useState("400 EGP");
  const [customMessage, setCustomMessage] = useState("");

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
            <span className="text-xs text-slate-500">{previewMessage.length} characters</span>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 font-arabic text-sm leading-7 text-emerald-100 dir-rtl">
            <p className="whitespace-pre-wrap">{previewMessage}</p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-white/8">
          {phone ? (
            <a
              aria-label="Send via WhatsApp Web"
              className="flex h-11 w-full items-center justify-center gap-2 bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500"
              href={waLink}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Send aria-hidden="true" size={16} />
              إرسال عبر واتساب (Send via WhatsApp)
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
