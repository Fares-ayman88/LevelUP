import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { auditLogs, organizations } from "@/db/schema";
import { getDatabase } from "@/db/client";
import { requirePermission } from "@/lib/authorization/permissions";
import { sendWhatsAppMessage, sendBulkWhatsAppMessages, type MessageDeliveryResult, type MessageRecipient } from "@/lib/waha/messaging-service";
import type { CenterAdminWorkspaceContext } from "@/lib/workspace/payment-channels";

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
    content: "تنبيه هام للطلاب: نود إعلامكم بتأجيل حادي حصة مادة {{subject_name}} لمجموعة {{group_name}} المقرر لها يوم {{session_date}}. وسيتم تعويض الحصة في موعد بديل يحدد لاحقاً.",
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

export type OutboxMessageLog = {
  createdAt: Date;
  id: string;
  recipientPhone: string;
  recipientRole: string;
  text: string;
};

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
  // Normalize Egyptian mobile number
  let cleanPhone = phoneNumber.replace(/\D/g, "");
  if (cleanPhone.startsWith("01")) {
    cleanPhone = `20${cleanPhone.slice(1)}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export async function logCommunicationDispatch(
  context: CenterAdminWorkspaceContext,
  recipientPhone: string,
  messageText: string,
): Promise<void> {
  requirePermission(
    { organizationId: context.organization.id, roles: context.organization.roles, userId: context.userId },
    "organization.manage_settings",
  );

  const db = getDatabase();

  await db.insert(auditLogs).values({
    action: "communication.dispatched",
    actorMembershipId: context.actorMembershipId,
    entityId: context.organization.id,
    entityType: "organization",
    metadata: {
      recipientPhone,
      textLength: messageText.length,
    },
    organizationId: context.organization.id,
  });
}

/**
 * Send a single message via WAHA and log the dispatch.
 */
export async function dispatchViaWaha(
  context: CenterAdminWorkspaceContext,
  recipientPhone: string,
  messageText: string,
): Promise<MessageDeliveryResult> {
  requirePermission(
    { organizationId: context.organization.id, roles: context.organization.roles, userId: context.userId },
    "organization.manage_settings",
  );

  const result = await sendWhatsAppMessage(recipientPhone, messageText);

  // Log the dispatch regardless of delivery status
  const db = getDatabase();
  await db.insert(auditLogs).values({
    action: "communication.waha_dispatched",
    actorMembershipId: context.actorMembershipId,
    entityId: context.organization.id,
    entityType: "organization",
    metadata: {
      deliveryStatus: result.status,
      error: result.error,
      recipientPhone,
      textLength: messageText.length,
    },
    organizationId: context.organization.id,
  });

  return result;
}

/**
 * Send messages to multiple recipients via WAHA with rate limiting.
 * Each dispatch is individually logged.
 */
export async function dispatchBulkViaWaha(
  context: CenterAdminWorkspaceContext,
  recipients: MessageRecipient[],
): Promise<MessageDeliveryResult[]> {
  requirePermission(
    { organizationId: context.organization.id, roles: context.organization.roles, userId: context.userId },
    "organization.manage_settings",
  );

  const results = await sendBulkWhatsAppMessages(recipients);

  // Log each individual dispatch
  const db = getDatabase();
  for (const result of results) {
    const recipient = recipients.find((r) => r.phoneE164 === result.phoneE164);
    await db.insert(auditLogs).values({
      action: "communication.waha_dispatched",
      actorMembershipId: context.actorMembershipId,
      entityId: context.organization.id,
      entityType: "organization",
      metadata: {
        deliveryStatus: result.status,
        error: result.error,
        recipientPhone: result.phoneE164,
        textLength: recipient?.message.length ?? 0,
      },
      organizationId: context.organization.id,
    });
  }

  return results;
}

