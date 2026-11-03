// Server-only configuration. Everything comes from environment variables (see .env.example).
import 'server-only';

export const env = {
  MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/byteleaf',
  APP_URL: (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  // SMTP. When SMTP_HOST is empty, emails are printed to the server console instead (dev).
  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  MAIL_FROM: process.env.MAIL_FROM ?? 'byteleaf <no-reply@yourdomain.co.za>',
  // S3-compatible object storage (Garage). With S3_ENDPOINT empty, files go to ./storage on disk (dev fallback).
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? '',
  S3_REGION: process.env.S3_REGION ?? 'garage',
  S3_BUCKET: process.env.S3_BUCKET ?? 'byteleaf',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? '',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? '',
  // 32-byte key (64 hex chars) that encrypts two-step secrets at rest. Required in production.
  TOTP_ENCRYPTION_KEY: process.env.TOTP_ENCRYPTION_KEY ?? '',
  // Knowledge assistant: DeepSeek, the same provider and variable names as Yenza'iCV. With no key the assistant
  // still answers, but by quoting its best-matching source.
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? '',
  LLM_MODEL: process.env.LLM_MODEL ?? 'deepseek-chat',
  LLM_BASE_URL: (process.env.LLM_BASE_URL ?? 'https://api.deepseek.com').replace(/\/$/, ''),
  // WhatsApp Business Cloud API (Meta). Without these the booking assistant still runs in the demo simulator.
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN ?? '',
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET ?? '',
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ?? '',
  WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION ?? 'v21.0',
  WHATSAPP_REMINDER_TEMPLATE: process.env.WHATSAPP_REMINDER_TEMPLATE ?? '',
  WHATSAPP_TEMPLATE_LANG: process.env.WHATSAPP_TEMPLATE_LANG ?? 'en',
  // Shared secret for the scheduled call that sends appointment reminders.
  CRON_SECRET: process.env.CRON_SECRET ?? '',
  // Hard stop on AI-written answers per day across all visitors, so a public demo can't run up a bill.
  ASSISTANT_DAILY_LIMIT: Number(process.env.ASSISTANT_DAILY_LIMIT ?? 1500),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};

export const isProd = env.NODE_ENV === 'production';
