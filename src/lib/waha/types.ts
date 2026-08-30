/** WAHA (WhatsApp HTTP API) request/response types. */

/** Chat ID format for individual WhatsApp users. */
export type WahaChatId = `${string}@c.us`;

/** Payload for POST /api/sendText */
export type WahaSendTextRequest = {
  chatId: WahaChatId;
  session: string;
  text: string;
};

/** Successful response from POST /api/sendText */
export type WahaSendTextResponse = {
  id: string;
  timestamp: number;
};

/** Session status values from GET /api/sessions/:name */
export type WahaSessionStatus =
  | "FAILED"
  | "SCAN_QR_CODE"
  | "STARTING"
  | "STOPPED"
  | "WORKING";

/** Response from GET /api/sessions/:name */
export type WahaSessionInfo = {
  engine: string;
  name: string;
  status: WahaSessionStatus;
};

/** Standardised error shape returned when a WAHA call fails. */
export class WahaApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "WahaApiError";
    this.statusCode = statusCode;
  }
}
