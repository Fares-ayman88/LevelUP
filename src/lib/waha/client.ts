import type {
  WahaChatId,
  WahaSendTextRequest,
  WahaSendTextResponse,
  WahaSessionInfo,
} from "./types";
import { WahaApiError } from "./types";

export type WahaClientOptions = {
  /** API key for WAHA authentication. Optional in development. */
  apiKey?: string;
  /** Base URL of the WAHA instance, e.g. "http://localhost:3001". */
  apiUrl: string;
  /** WAHA session name. Defaults to "default". */
  sessionName?: string;
};

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Converts an E.164 phone number (e.g. "+201234567890") to a WAHA chat ID
 * (e.g. "201234567890@c.us").
 */
export function phoneE164ToChatId(phoneE164: string): WahaChatId {
  return `${phoneE164.replace(/^\+/, "")}@c.us` as WahaChatId;
}

async function assertOk(response: Response, context: string): Promise<void> {
  if (response.ok) return;

  let detail: string;
  try {
    const body = await response.text();
    detail = body.slice(0, 500);
  } catch {
    detail = response.statusText;
  }

  throw new WahaApiError(`WAHA ${context} failed (${response.status}): ${detail}`, response.status);
}

/**
 * Lightweight HTTP client for the WAHA REST API.
 *
 * Each method hits a single endpoint, handles timeouts and error mapping,
 * and returns a typed response.
 */
export function createWahaClient(options: WahaClientOptions) {
  const baseUrl = options.apiUrl.replace(/\/$/, "");
  const session = options.sessionName ?? "default";

  function headers(): HeadersInit {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (options.apiKey) {
      h["X-Api-Key"] = options.apiKey;
    }
    return h;
  }

  return {
    /**
     * Send a plain-text WhatsApp message.
     *
     * @see https://waha.devlike.pro/docs/how-to/send-messages/
     */
    async sendText(chatId: WahaChatId, text: string): Promise<WahaSendTextResponse> {
      const payload: WahaSendTextRequest = { chatId, session, text };

      const response = await fetch(`${baseUrl}/api/sendText`, {
        body: JSON.stringify(payload),
        headers: headers(),
        method: "POST",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      await assertOk(response, "sendText");

      return (await response.json()) as WahaSendTextResponse;
    },

    /**
     * Retrieve the current session status.
     *
     * @see https://waha.devlike.pro/docs/how-to/sessions/
     */
    async getSessionStatus(): Promise<WahaSessionInfo> {
      const response = await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(session)}`, {
        headers: headers(),
        method: "GET",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      await assertOk(response, "getSessionStatus");

      return (await response.json()) as WahaSessionInfo;
    },

    /**
     * Start or re-start the WAHA session.
     * Call this if the session is STOPPED or FAILED.
     */
    async startSession(): Promise<void> {
      const response = await fetch(`${baseUrl}/api/sessions/start`, {
        body: JSON.stringify({ name: session }),
        headers: headers(),
        method: "POST",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      await assertOk(response, "startSession");
    },
  };
}

export type WahaClient = ReturnType<typeof createWahaClient>;
