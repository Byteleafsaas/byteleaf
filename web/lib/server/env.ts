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
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};

export const isProd = env.NODE_ENV === 'production';
