import 'server-only';
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

// Money is integer cents (ZAR). Dates are 'YYYY-MM-DD' / 'HH:mm' in SAST; UTC instants are stored as Date where queries need them.

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, schema);
}

/* ---------- Auth ---------- */
const adminUserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    twoStepEnabled: { type: Boolean, default: false },
    totpSecretEnc: { type: String, default: null }, // AES-GCM encrypted base32 secret
    totpPendingEnc: { type: String, default: null }, // secret during enrolment, before the first code is confirmed
    totpLastStep: { type: Number, default: 0 }, // replay protection
    backupCodes: { type: [String], default: [] }, // sha256 hashes, removed when used
  },
  { timestamps: true },
);
export const AdminUser = model('AdminUser', adminUserSchema);

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    persistent: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    userAgent: String,
    ip: String,
  },
  { timestamps: true },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Session = model('Session', sessionSchema);

const resetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const ResetToken = model('ResetToken', resetTokenSchema);

// Password accepted but the second step is still to do. Short-lived and attempt-limited.
const pendingLoginSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  tokenHash: { type: String, required: true, unique: true },
  remember: { type: Boolean, default: false },
  next: { type: String, default: '/admin' },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
pendingLoginSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const PendingLogin = model('PendingLogin', pendingLoginSchema);

// Fixed-window rate limiting for sign-in / forgot-password (per key = ip or email).
const rateLimitSchema = new Schema({ key: { type: String, required: true, unique: true }, count: { type: Number, default: 0 }, resetAt: { type: Date, required: true } });
rateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimit = model('RateLimit', rateLimitSchema);

/* ---------- Bookings & messages ---------- */
const bookingSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    company: { type: String, default: '' },
    meetingType: { type: String, enum: ['discovery', 'deep-dive', 'in-person'], required: true },
    typeLabel: { type: String, required: true },
    where: { type: String, required: true },
    durationMin: { type: Number, required: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD SAST
    time: { type: String, required: true }, // HH:mm SAST
    startsAt: { type: Date, required: true, index: true }, // UTC instant
    status: { type: String, enum: ['pending', 'confirmed', 'rescheduled', 'completed', 'cancelled'], default: 'pending', index: true },
    note: { type: String, default: '' },
    history: [{ text: String, at: { type: Date, default: Date.now }, actor: { type: String, default: 'client' }, _id: false }],
  },
  { timestamps: true },
);
export const Booking = model('Booking', bookingSchema);

const messageSchema = new Schema(
  {
    name: { type: String, required: true },
    company: { type: String, default: '' },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    needs: [String],
    model: { type: String, default: '' },
    start: { type: String, default: '' },
    message: { type: String, default: '' },
    read: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export const Message = model('Message', messageSchema);

/* ---------- Projects ---------- */
const projectSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    client: { type: String, default: '' },
    type: { type: String, default: '' },
    industry: { type: String, default: 'Other' },
    categories: [{ type: String, enum: ['Design', 'Frontend', 'Backend', 'AI'] }],
    stack: [String],
    summary: { type: String, default: '', maxlength: 140 },
    challenge: { type: String, default: '' },
    whatWeDid: { type: String, default: '' },
    result: { type: String, default: '' },
    live: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    pattern: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
    cover: { type: new Schema({ key: String, width: Number, height: Number, alt: String }, { _id: false }), default: null },
    gallery: [new Schema({ key: String, width: Number, height: Number, alt: String }, { _id: false })],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export const Project = model('Project', projectSchema);

/* ---------- Billing ---------- */
const clientSchema = new Schema(
  {
    company: { type: String, required: true },
    contactName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    vatNumber: { type: String, default: '' },
  },
  { timestamps: true },
);
export const Client = model('Client', clientSchema);

const lineSchema = new Schema({ description: String, detail: String, quantity: Number, rate: Number }, { _id: false });
const paymentSchema = new Schema({ amount: Number, paidOn: String, method: { type: String, enum: ['eft', 'card', 'cash'] }, note: String }, { _id: false });
const docEventSchema = new Schema({ type: String, at: { type: Date, default: Date.now } }, { _id: false });

const documentSchema = new Schema(
  {
    kind: { type: String, enum: ['quote', 'invoice'], required: true, index: true },
    number: { type: String, default: null },
    status: { type: String, enum: ['draft', 'sent', 'accepted', 'declined', 'expired', 'invoiced', 'paid', 'void'], default: 'draft', index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    reference: { type: String, default: '' },
    issueDate: { type: String, required: true },
    dueDate: { type: String, default: null },
    validUntil: { type: String, default: null },
    termsDays: { type: Number, default: 14 },
    lines: [lineSchema],
    discountPct: { type: Number, default: 0 },
    depositPct: { type: Number, default: null },
    vatApplied: { type: Boolean, default: false },
    vatRate: { type: Number, default: 15 },
    notes: { type: String, default: '' },
    quoteId: { type: Schema.Types.ObjectId, default: null },
    // totals stored at send time (cents)
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    vat: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    sentAt: { type: String, default: null },
    payments: [paymentSchema],
    events: [docEventSchema],
    pdfVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);
// Numbers are unique per kind (a draft may have none yet).
documentSchema.index({ kind: 1, number: 1 }, { unique: true, partialFilterExpression: { number: { $type: 'string' } } });
export const BillingDocument = model('BillingDocument', documentSchema);

/* ---------- Settings (single document) ---------- */
const priceSchema = new Schema({ text: { type: String, default: '' }, unit: String }, { _id: false });
const settingsSchema = new Schema(
  {
    key: { type: String, default: 'site', unique: true },
    business: {
      publicEmail: { type: String, default: '' }, phone: { type: String, default: '' }, location: { type: String, default: 'Johannesburg, South Africa' },
      hours: { type: String, default: '' }, replyWithin: { type: String, default: '4 business hours' }, urgentResponse: { type: String, default: '2 hours' }, notifyEmail: { type: String, default: '' },
    },
    prices: { care: priceSchema, build: priceSchema, fix: priceSchema, team: priceSchema, includedHours: { type: String, default: '' } },
    availability: {
      workingDays: [Number],
      startTimes: [String],
      meetingTypes: [{ key: String, name: String, where: String, enabled: Boolean, minutes: Number, _id: false }],
      minNotice: { type: String, default: 'Next working day' },
      bufferMin: { type: String, default: '15 min' },
      maxPerDay: { type: Number, default: 4 },
      blocked: [{ from: String, to: String, _id: false }],
    },
    invoicing: {
      legalName: { type: String, default: '' }, regNo: { type: String, default: '' }, address: { type: String, default: '' },
      vatRegistered: { type: Boolean, default: false }, vatNumber: { type: String, default: '' },
      bank: { name: { type: String, default: '' }, accountName: { type: String, default: '' }, accountNo: { type: String, default: '' }, branchCode: { type: String, default: '' } },
      nextQuoteNo: { type: String, default: 'Q-2026-001' }, nextInvoiceNo: { type: String, default: 'INV-2026-001' },
      defaultTermsDays: { type: String, default: '14 days' }, quoteValidDays: { type: String, default: '30 days' }, defaultDepositPct: { type: String, default: '50%' },
      defaultInvoiceNotes: { type: String, default: 'Please use the invoice number as your payment reference. Thank you for your business.' },
    },
  },
  { timestamps: true },
);
export const SettingsModel = model('Settings', settingsSchema);

export type AdminUserDoc = InferSchemaType<typeof adminUserSchema>;
