import "server-only";

import { z } from "zod";

function getResolvedAppUrl(source: NodeJS.ProcessEnv): string {
  if (source.APP_URL && source.APP_URL.startsWith("http")) {
    return source.APP_URL;
  }
  if (source.VERCEL_URL) {
    return `https://${source.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

const serverEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url(),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
    SESSION_SECRET: z.string().min(32),
    APP_URL: z.string().url().default("http://localhost:3000"),
    CRON_SECRET: z.string().min(16).optional(),
    GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().trim().min(1).optional(),
    OTP_PROVIDER: z.enum(["development", "infobip"]).default("development"),
    OTP_SENDER_ID: z.string().trim().min(1).max(32).optional(),
    INFOBIP_BASE_URL: z.string().url().optional(),
    INFOBIP_API_KEY: z.string().trim().min(1).optional(),
    EMAIL_OTP_PROVIDER: z.enum(["development", "resend"]).default("development"),
    RESEND_API_KEY: z.string().trim().min(1).optional(),
    RESEND_FROM: z.string().trim().min(3).max(320).optional(),
    OBJECT_STORAGE_ENDPOINT: z.string().url().optional(),
    OBJECT_STORAGE_BUCKET: z.string().trim().min(3).optional(),
    OBJECT_STORAGE_REGION: z.string().trim().min(1).optional(),
    OBJECT_STORAGE_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
    OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().trim().min(1).optional(),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === "production" && !environment.CRON_SECRET) {
      context.addIssue({
        code: "custom",
        message: "CRON_SECRET is required in production.",
        path: ["CRON_SECRET"],
      });
    }

    if (environment.NODE_ENV === "production" && environment.EMAIL_OTP_PROVIDER === "development") {
      context.addIssue({
        code: "custom",
        message: "EMAIL_OTP_PROVIDER must use a production provider outside development.",
        path: ["EMAIL_OTP_PROVIDER"],
      });
    }

    if (environment.OTP_PROVIDER === "infobip") {
      if (!environment.INFOBIP_BASE_URL) {
        context.addIssue({
          code: "custom",
          message: "INFOBIP_BASE_URL is required when OTP_PROVIDER=infobip.",
          path: ["INFOBIP_BASE_URL"],
        });
      }

      if (!environment.INFOBIP_API_KEY) {
        context.addIssue({
          code: "custom",
          message: "INFOBIP_API_KEY is required when OTP_PROVIDER=infobip.",
          path: ["INFOBIP_API_KEY"],
        });
      }

      if (!environment.OTP_SENDER_ID) {
        context.addIssue({
          code: "custom",
          message: "OTP_SENDER_ID is required when OTP_PROVIDER=infobip.",
          path: ["OTP_SENDER_ID"],
        });
      }
    }

    if (environment.EMAIL_OTP_PROVIDER === "resend") {
      if (!environment.RESEND_API_KEY) {
        context.addIssue({
          code: "custom",
          message: "RESEND_API_KEY is required when EMAIL_OTP_PROVIDER=resend.",
          path: ["RESEND_API_KEY"],
        });
      }

      if (!environment.RESEND_FROM) {
        context.addIssue({
          code: "custom",
          message: "RESEND_FROM is required when EMAIL_OTP_PROVIDER=resend.",
          path: ["RESEND_FROM"],
        });
      }
    }

    if (Boolean(environment.GOOGLE_CLIENT_ID) !== Boolean(environment.GOOGLE_CLIENT_SECRET)) {
      context.addIssue({
        code: "custom",
        message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together.",
        path: ["GOOGLE_CLIENT_ID"],
      });
    }
  });

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function getServerEnvironment(source: NodeJS.ProcessEnv = process.env): ServerEnvironment {
  const preparedSource = {
    ...source,
    APP_URL: getResolvedAppUrl(source),
  };
  return serverEnvironmentSchema.parse(preparedSource);
}
