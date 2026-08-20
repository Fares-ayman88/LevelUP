export type CommunicationTemplate = {
  category: "payment_reminder" | "class_cancellation" | "exam_alert" | "custom";
  content: string;
  id: string;
  title: string;
};

export const defaultCommunicationTemplates: CommunicationTemplate[] = [
  {
    category: "payment_reminder",
    content: "مرحباً {{guardian_name}}، نود تذكير حضرتك بأن اشتراك الطالب {{student_name}} في مجموعة {{group_name}} لمادة {{subject_name}} بقيمة {{amount}} مستحق الدفع. يسعدنا سداد المبلغ عبر حساب السنتر على LevelUp.",
    id: "payment-due",
    title: "تذكير بموعد الدفع (Payment Reminder)",
  },
  {
    category: "class_cancellation",
    content: "تنبيه هام للطلاب: نود إعلامكم بتأجيل حصة مادة {{subject_name}} لمجموعة {{group_name}} المقرر لها يوم {{session_date}}. وسيتم تعويض الحصة في موعد بديل يحدد لاحقاً.",
    id: "class-cancel",
    title: "إلغاء/تأجيل حصة (Class Reschedule)",
  },
  {
    category: "exam_alert",
    content: "مرحباً، تم رصد درجات امتحان مادة {{subject_name}} لمجموعة {{group_name}}. درجة الطالب {{student_name}}: {{score}}/{{max_score}}. نتمنى له دوام التوفيق والنجاح.",
    id: "exam-score",
    title: "إخطار بدرجات الامتحان (Exam Result)",
  },
];

export function interpolateTemplate(
  templateText: string,
  variables: Record<string, string>,
): string {
  let result = templateText;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export function generateWhatsAppLink(phoneNumber: string, message: string): string {
  let cleanPhone = phoneNumber.replace(/\D/g, "");
  if (cleanPhone.startsWith("01")) {
    cleanPhone = `20${cleanPhone.slice(1)}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
