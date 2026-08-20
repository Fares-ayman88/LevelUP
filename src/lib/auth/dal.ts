import "server-only";

import { redirect } from "next/navigation";

import {
  getActiveOrganizationContext,
  getCurrentSession,
  type ActiveOrganizationContext,
  type AuthenticatedSession,
} from "./service";

export async function requireSession(): Promise<AuthenticatedSession> {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  return session;
}

export async function requireActiveOrganization(): Promise<ActiveOrganizationContext> {
  const session = await requireSession();
  if (!session.organizationId) redirect("/select-organization");

  const context = await getActiveOrganizationContext(session);
  if (!context) redirect("/select-organization");

  return context;
}
