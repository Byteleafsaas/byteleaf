'use client';

import Link from 'next/link';
import ListSelect from '@/components/ListSelect';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { LogoMark } from '@/components/Logo';
import { ICON, PathIcon } from '@/components/admin/icons';
import { Switch } from '@/components/admin/Ui';
import s from '@/components/admin/admin.module.css';
import b from '@/components/admin/billing.module.css';
import { calcTotals, dueFromTerms, pctFromText, termsToDays } from '@/lib/admin/billing';
import { createClientAction, saveDocumentAction, setQuoteStatusAction, voidInvoiceAction, type DocInput } from '@/lib/server/actions/billing';
import type { BillingDocument, Client, DocKind } from '@/lib/admin/billing-types';
import { fmtShort, formatZAR, todayKey } from '@/lib/admin/format';
import { INVOICE_DEFAULT_NOTES, QUOTE_DEFAULT_NOTES } from '@/lib/admin/mock-billing';
import { useAdmin } from '@/lib/admin/store';

type Line = { id: number; description: string; detail?: string; quantity: string; rate: string /* rands */ };
type Draft = {
  kind: DocKind; clientId: string; reference: string; issueDate: string; termsDays: number;
  lines: Line[]; discountPct: string; depositPct: string; vatApplied: boolean; notes: string;
};

const num = (v: string) => {
  const x = parseFloat(v);
  return Number.isNaN(x) ? 0 : x;
};
const toCents = (rands: string) => Math.round(num(rands) * 100);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Quick-add presets: the rate comes from Settings › Prices when that value is numeric, otherwise 0.
const PRESETS = [
  { label: 'Care plan (monthly)', description: 'Maintenance — monthly care plan', price: 'care' },
  { label: 'Development (hourly)', description: 'Development — per hour', price: 'fix' },
  { label: 'Bug fix', description: 'Bug investigation & fix', price: 'fix' },
  { label: 'Design sprint', description: 'UX / UI design sprint', price: 'build' },
] as const;

export default function DocumentEditor({ id, initialKind }: { id?: string; initialKind?: DocKind }) {
  const { documents, setDocuments, clients, setClients, settings, notify, refresh } = useAdmin();
  const router = useRouter();
  const existing = id ? documents.find((d) => d.id === id) : undefined;
  const nextId = useRef(100);
  const [today] = useState(todayKey);

  const defaults = (kind: DocKind): Pick<Draft, 'termsDays' | 'notes'> => ({
    termsDays: kind === 'quote' ? termsToDays(settings.invoicing.quoteValidDays) : termsToDays(settings.invoicing.defaultTermsDays),
    notes: kind === 'quote' ? QUOTE_DEFAULT_NOTES : settings.invoicing.defaultInvoiceNotes || INVOICE_DEFAULT_NOTES,
  });

  const [f, setF] = useState<Draft>(() => {
    if (existing) {
      return {
        kind: existing.kind, clientId: existing.clientId, reference: existing.reference, issueDate: existing.issueDate, termsDays: existing.termsDays,
        lines: existing.lines.map((l, i) => ({ id: i + 1, description: l.description, detail: l.detail, quantity: String(l.quantity), rate: String(l.rate / 100) })),
        discountPct: String(existing.discountPct), depositPct: String(existing.depositPct ?? 0), vatApplied: existing.vatApplied, notes: existing.notes,
      };
    }
    const kind: DocKind = initialKind === 'invoice' ? 'invoice' : 'quote';
    return {
      kind, clientId: clients[0]?.id ?? '', reference: '', issueDate: today, ...defaults(kind),
      lines: [{ id: 1, description: '', quantity: '1', rate: '0' }],
      discountPct: '0', depositPct: String(pctFromText(settings.invoicing.defaultDepositPct)), vatApplied: settings.invoicing.vatRegistered,
    };
  });
  const [newClient, setNewClient] = useState<Omit<Client, 'id'> | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (id && !existing) {
    return (
      <>
        <header className={s.topbar}><div className={s.titleBox}><span className={s.crumb}>Admin / Quotes & invoices</span><h1 className={s.h1}>Document not found</h1></div></header>
        <div className={s.content}><Link className={`${s.btn} ${s.btnPrimary}`} style={{ alignSelf: 'flex-start' }} href="/admin/billing">Back to quotes & invoices</Link></div>
      </>
    );
  }

  const readOnly = !!existing && existing.status !== 'draft';
  const isQuote = f.kind === 'quote';
  const client = clients.find((c) => c.id === f.clientId);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((o) => ({ ...o, [k]: v }));
  const setLine = (lid: number, p: Partial<Line>) => setF((o) => ({ ...o, lines: o.lines.map((l) => (l.id === lid ? { ...l, ...p } : l)) }));

  const switchKind = (kind: DocKind) => {
    if (kind === f.kind) return;
    setF((o) => {
      const prev = defaults(o.kind);
      const next = defaults(kind);
      return { ...o, kind, termsDays: next.termsDays, notes: o.notes === prev.notes ? next.notes : o.notes };
    });
  };

  const lines = f.lines.map((l) => ({ quantity: num(l.quantity), rate: toCents(l.rate) }));
  const t = calcTotals(lines, { discountPct: num(f.discountPct), vatApplied: f.vatApplied, depositPct: isQuote ? num(f.depositPct) : null });
  const dateKey = dueFromTerms(f.issueDate, f.termsDays);
  const dueText = f.termsDays === 0 && !isQuote ? 'On receipt' : dateKey ? fmtShort(dateKey) : '—';
  const previewNo = existing?.number ?? (isQuote ? settings.invoicing.nextQuoteNo : settings.invoicing.nextInvoiceNo);
  const title = isQuote ? 'QUOTE' : f.vatApplied ? 'TAX INVOICE' : 'INVOICE';

  const addLine = (description = '', rate = '0') => setF((o) => ({ ...o, lines: [...o.lines, { id: nextId.current++, description, quantity: '1', rate }] }));
  const priceNumber = (key: 'care' | 'build' | 'fix') => {
    const digits = settings.prices[key].text.replace(/[^0-9.]/g, '');
    return digits && !Number.isNaN(Number(digits)) ? digits : '0';
  };

  // Payload for the Server Actions (money in cents). The server recomputes totals and applies every rule again.
  const toInput = (): DocInput => ({
    id: existing?.id, kind: f.kind, clientId: f.clientId, reference: f.reference.trim(), issueDate: f.issueDate, termsDays: f.termsDays,
    lines: f.lines.map((l) => ({ description: l.description, detail: l.detail, quantity: num(l.quantity), rate: toCents(l.rate) })),
    discountPct: num(f.discountPct), depositPct: isQuote ? num(f.depositPct) : null, vatApplied: f.vatApplied, notes: f.notes,
  });


  // Create a client from the inline form and select it.
  const addClient = async () => {
    if (!newClient || !newClient.company.trim()) return;
    setBusy(true);
    const r = await createClientAction(newClient);
    setBusy(false);
    if (!r.ok) return notify(r.error);
    setClients((all) => [...all, r.client]);
    set('clientId', r.client.id);
    setNewClient(null);
  };

  const persist = (doc: BillingDocument) => {
    setDocuments((all) => (all.some((d) => d.id === doc.id) ? all.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...all]));
  };

  // The number is allocated on the server, atomically, the first time a document is saved.
  const saveDraft = async () => {
    setBusy(true);
    const r = await saveDocumentAction(toInput(), 'draft');
    setBusy(false);
    if (!r.ok) return notify(r.error);
    persist(r.document);
    notify(`${isQuote ? 'Quote' : 'Invoice'} ${r.document.number} saved as draft.`);
    refresh();
    if (!existing) router.replace(`/admin/billing/${r.document.id}`);
  };

  const send = async () => {
    const issues: string[] = [];
    if (!f.lines.some((l) => l.description.trim() && num(l.quantity) > 0)) issues.push('Add at least one line item.');
    if (!client) issues.push('Choose who to bill.');
    else if (!EMAIL.test(client.email)) issues.push('The client needs an email address.');
    if (t.total <= 0) issues.push('The total must be more than R 0.00.');
    setProblems(issues);
    if (issues.length || !client) return;
    setBusy(true);
    const r = await saveDocumentAction(toInput(), 'send');
    setBusy(false);
    if (!r.ok) return setProblems([r.error]);
    persist(r.document);
    notify(r.warning ?? `${isQuote ? 'Quote' : 'Invoice'} ${r.document.number} emailed to ${client.contactName || client.company} as a PDF.`);
    refresh();
    if (!existing) router.replace(`/admin/billing/${r.document.id}`);
  };

  const voidInvoice = async () => {
    if (!existing) return;
    const r = await voidInvoiceAction(existing.id);
    if (!r.ok) return notify(r.error);
    persist(r.document);
    notify(`${existing.number} voided.`);
    refresh();
  };

  const setQuote = async (status: 'accepted' | 'declined') => {
    if (!existing) return;
    const r = await setQuoteStatusAction(existing.id, status);
    if (!r.ok) return notify(r.error);
    persist(r.document);
    notify(`${existing.number} marked as ${status}.`);
    refresh();
  };

  const pdfHref = existing ? `/admin/billing/${existing.id}/pdf` : undefined;

  return (
    <>
      <header className={s.topbar}>
        <div className={s.titleBox}>
          <Link className={`${s.crumb} ${s.col}`} href="/admin/billing" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PathIcon d="M19 12H5M11 18l-6-6 6-6" size={14} sw={2} />
            Quotes &amp; invoices
          </Link>
          <h1 className={s.h1}>
            {existing ? (isQuote ? 'Quote' : 'Invoice') : `New ${isQuote ? 'quote' : 'invoice'}`} <span className={b.docNo}>{previewNo}</span>
          </h1>
        </div>
        <div className={s.actions}>
          <div role="group" aria-label="Document type" className={b.seg}>
            <button type="button" className={b.segBtn} aria-pressed={isQuote} disabled={!!existing} onClick={() => switchKind('quote')}>Quote</button>
            <button type="button" className={b.segBtn} aria-pressed={!isQuote} disabled={!!existing} onClick={() => switchKind('invoice')}>Invoice</button>
          </div>
          {!readOnly && <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={saveDraft} disabled={busy}>Save draft</button>}
          {pdfHref ? (
            <a className={`${s.btn} ${s.btnGhost}`} href={pdfHref} target="_blank" rel="noreferrer"><PathIcon d="M12 4v11M7 10l5 5 5-5M5 20h14" />PDF</a>
          ) : (
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => notify('Save the draft first, then open the PDF.')}><PathIcon d="M12 4v11M7 10l5 5 5-5M5 20h14" />PDF</button>
          )}
          {!readOnly && (
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={send} disabled={busy}>
              <PathIcon d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
              Send to client
            </button>
          )}
          {existing && isQuote && existing.status === 'sent' && (<><button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setQuote('accepted')}>Mark accepted</button><button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setQuote('declined')}>Mark declined</button></>)}
          {existing && !isQuote && (existing.status === 'sent') && <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={voidInvoice}>Void invoice</button>}
        </div>
      </header>

      <div className={b.edit}>
        <form className={b.form} onSubmit={(e) => e.preventDefault()}>
          {readOnly && (
            <div className={b.locked} role="status">
              <PathIcon d={ICON.check} size={20} sw={2} />
              <span>This {isQuote ? 'quote' : 'invoice'} has been {existing?.status === 'void' ? 'voided' : 'sent'} and is read-only. To change a sent invoice, void it and issue a new one.</span>
            </div>
          )}
          {problems.length > 0 && (
            <div className={b.errBox} role="alert">
              Can&apos;t send yet:
              <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}

          <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <section className={`${s.panel} ${s.rise} ${b.sec}`} aria-labelledby="h-cl">
              <h2 id="h-cl">Client &amp; details</h2>
              <div className={b.g}>
                <div className={s.fg}>
                  <label htmlFor="c-cl" className={s.label}>Bill to</label>
                  <ListSelect id="c-cl" triggerClass={`${s.field} ${b.fld}`} value={newClient ? 'new' : f.clientId}
                    options={[...clients.map((c) => ({ value: c.id, label: `${c.company} — ${c.contactName}` })), { value: 'new', label: '+ New client…' }]}
                    onChange={(v) => {
                      if (v === 'new') setNewClient({ company: '', contactName: '', email: '', phone: '', address: '', vatNumber: '' });
                      else { setNewClient(null); set('clientId', v); }
                    }} />
                </div>
                <div className={s.fg}><label htmlFor="c-ref" className={s.label}>Project / reference</label><input id="c-ref" className={`${s.field} ${b.fld}`} type="text" value={f.reference} onChange={(e) => set('reference', e.target.value)} /></div>
                <div className={s.fg}><label htmlFor="c-iss" className={s.label}>Issue date</label><input id="c-iss" className={`${s.field} ${b.fld}`} type="date" value={f.issueDate} onChange={(e) => set('issueDate', e.target.value)} /></div>
                <div className={s.fg}>
                  <label htmlFor="c-due" className={s.label}>{isQuote ? 'Valid for' : 'Payment due'}</label>
                  <ListSelect id="c-due" triggerClass={`${s.field} ${b.fld}`} value={String(f.termsDays)}
                    options={(isQuote ? [30, 14, 60] : [14, 7, 30, 0]).map((d) => ({ value: String(d), label: d === 0 ? 'On receipt' : `${d} days` }))}
                    onChange={(v) => set('termsDays', Number(v))} />
                </div>
              </div>

              {newClient && (
                <div className={b.g} style={{ padding: 14, border: '1px solid var(--line-3)', borderRadius: 12 }}>
                  <div className={s.fg}><label htmlFor="nc-co" className={s.label}>Company</label><input id="nc-co" className={`${s.field} ${b.fld}`} value={newClient.company} onChange={(e) => setNewClient({ ...newClient, company: e.target.value })} /></div>
                  <div className={s.fg}><label htmlFor="nc-ct" className={s.label}>Contact name</label><input id="nc-ct" className={`${s.field} ${b.fld}`} value={newClient.contactName} onChange={(e) => setNewClient({ ...newClient, contactName: e.target.value })} /></div>
                  <div className={s.fg}><label htmlFor="nc-em" className={s.label}>Email</label><input id="nc-em" className={`${s.field} ${b.fld}`} type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} /></div>
                  <div className={s.fg}><label htmlFor="nc-ad" className={s.label}>Address</label><input id="nc-ad" className={`${s.field} ${b.fld}`} value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} /></div>
                  <div className={s.fg}><label htmlFor="nc-vt" className={s.label}>VAT no. <i style={{ fontStyle: 'normal', fontWeight: 400, color: 'var(--muted)' }}>(optional)</i></label><input id="nc-vt" className={`${s.field} ${b.fld}`} value={newClient.vatNumber} onChange={(e) => setNewClient({ ...newClient, vatNumber: e.target.value })} /></div>
                  <div className={s.btnRow} style={{ alignItems: 'flex-end' }}>
                    <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={!newClient.company.trim()} onClick={addClient}>Add client</button>
                    <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setNewClient(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {client && (
                <div className={b.strip}>
                  <span><i>Contact:</i> {client.contactName}</span>
                  <span><i>Email:</i> {client.email}</span>
                  <span><i>Address:</i> {client.address || '[Client address]'}</span>
                </div>
              )}
            </section>

            <section className={`${s.panel} ${s.rise} ${s.d1} ${b.sec}`} aria-labelledby="h-li" style={{ gap: 14 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <h2 id="h-li">Line items</h2>
                <span className={b.hint}>Amounts in rand (ZAR)</span>
              </div>
              <div className={b.liHead}><span>DESCRIPTION</span><span>QTY</span><span>RATE</span><span>AMOUNT</span><span /></div>
              {f.lines.map((l, i) => (
                <div key={l.id} className={b.irow}>
                  <div className={b.idesc} style={{ minWidth: 0 }}>
                    <label htmlFor={`d${l.id}`} className={s.sr}>Description, line {i + 1}</label>
                    <input id={`d${l.id}`} className={`${s.field} ${b.fld}`} type="text" value={l.description} placeholder="What are you charging for?" onChange={(e) => setLine(l.id, { description: e.target.value })} />
                  </div>
                  <div><label htmlFor={`q${l.id}`} className={s.sr}>Quantity, line {i + 1}</label><input id={`q${l.id}`} className={`${s.field} ${b.fld} ${b.num}`} type="number" min={0} step={0.5} value={l.quantity} onChange={(e) => setLine(l.id, { quantity: e.target.value })} /></div>
                  <div><label htmlFor={`r${l.id}`} className={s.sr}>Rate, line {i + 1}</label><input id={`r${l.id}`} className={`${s.field} ${b.fld} ${b.num}`} type="number" min={0} step={50} value={l.rate} onChange={(e) => setLine(l.id, { rate: e.target.value })} /></div>
                  <span className={b.amt}>{formatZAR(t.lines[i] ?? 0)}</span>
                  <button type="button" className={b.rm} aria-label={`Remove line ${i + 1}`} onClick={() => set('lines', f.lines.filter((x) => x.id !== l.id))}>
                    <PathIcon d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" size={16} />
                  </button>
                </div>
              ))}
              <div className={b.quick}>
                <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => addLine()}>+ Add line</button>
                <span className={b.hint} style={{ marginLeft: 6 }}>Quick add:</span>
                {PRESETS.map((p) => <button key={p.label} type="button" className={b.qchip} onClick={() => addLine(p.description, priceNumber(p.price))}>{p.label}</button>)}
              </div>
            </section>

            <section className={`${s.panel} ${s.rise} ${s.d2} ${b.sec}`} aria-labelledby="h-tot">
              <h2 id="h-tot">Totals &amp; terms</h2>
              <div className={b.g}>
                <div className={s.fg}><label htmlFor="t-disc" className={s.label}>Discount (%)</label><input id="t-disc" className={`${s.field} ${b.fld} ${b.num}`} type="number" min={0} max={100} value={f.discountPct} onChange={(e) => set('discountPct', e.target.value)} /></div>
                {isQuote && <div className={s.fg}><label htmlFor="t-dep" className={s.label}>Deposit to start (%)</label><input id="t-dep" className={`${s.field} ${b.fld} ${b.num}`} type="number" min={0} max={100} value={f.depositPct} onChange={(e) => set('depositPct', e.target.value)} /></div>}
              </div>
              <div className={b.vatBox}>
                <span className={b.vatText}><span id="vat-l">Charge VAT (15%)</span><span className={b.hint}>Only switch on once byteleaf is VAT-registered — invoices then become &quot;Tax invoices&quot;.</span></span>
                <Switch checked={f.vatApplied} onChange={(v) => set('vatApplied', v)} label="Charge VAT (15%)" />
              </div>
              <div className={s.fg}><label htmlFor="t-notes" className={s.label}>Notes &amp; terms (shown on the document)</label><textarea id="t-notes" className={`${s.field} ${s.area}`} rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
            </section>
          </fieldset>
        </form>

        <aside aria-label="Live preview" className={b.prevCol}>
          <div className={b.prevHead}><span>Preview</span><span>A4 · UPDATES AS YOU TYPE</span></div>
          <article className={`${b.page} ${s.rise} ${s.d1}`}>
            <div className={b.pTop}>
              <span className={b.pLogo}><LogoMark size={24} dot={false} />byteleaf</span>
              <span className={b.pTitle}><strong>{title}</strong><span>{previewNo}</span></span>
            </div>
            <div className={b.pCols}>
              <span className={b.pCol}><span className={b.k}>BILL TO</span><strong>{client?.company ?? '—'}</strong><span>{client?.contactName}</span><span className={b.m}>{client?.email}</span></span>
              <span className={b.pCol}>
                <span className={b.k}>FROM</span><strong>{settings.invoicing.legalName || 'byteleaf'}</strong><span>{settings.business.location || 'Johannesburg, South Africa'}</span>
                <span className={b.m}>{settings.invoicing.regNo || '[Reg. no.]'}</span>
                {f.vatApplied && <span className={b.m}>VAT no. {settings.invoicing.vatNumber || '[VAT number]'}</span>}
              </span>
              <span className={`${b.pCol} ${b.pRight}`}><span className={b.k}>ISSUED</span><span>{fmtShort(f.issueDate)}</span><span className={b.k} style={{ paddingTop: 4 }}>{isQuote ? 'VALID UNTIL' : 'DUE'}</span><span>{dueText}</span></span>
            </div>
            <div className={b.pRe}><i>Re:</i> <strong>{f.reference || '—'}</strong></div>
            <div className={b.pTable}>
              <div className={`${b.pTr} ${b.h}`}><span>DESCRIPTION</span><span>QTY</span><span>RATE</span><span>AMOUNT</span></div>
              {f.lines.map((l, i) => (
                <div key={l.id} className={b.pTr}><span>{l.description || '—'}</span><span>{l.quantity}</span><span>{formatZAR(toCents(l.rate))}</span><span>{formatZAR(t.lines[i] ?? 0)}</span></div>
              ))}
            </div>
            <div className={b.pTotals}>
              <div className={b.pTotalsIn}>
                <div className={b.pLine}><span className={b.l}>Subtotal</span><span className={b.v}>{formatZAR(t.subtotal)}</span></div>
                {t.discount > 0 && <div className={b.pLine}><span className={b.l}>Discount ({f.discountPct}%)</span><span className={b.v}>−{formatZAR(t.discount)}</span></div>}
                {f.vatApplied && <div className={b.pLine}><span className={b.l}>VAT (15%)</span><span className={b.v}>{formatZAR(t.vat)}</span></div>}
                <div className={`${b.pLine} ${b.pGrand}`}><span className={b.l}>{isQuote ? 'Quote total' : 'Total due'}</span><span className={b.v}>{formatZAR(t.total)}</span></div>
                {isQuote && num(f.depositPct) > 0 && <div className={`${b.pLine} ${b.pDep}`}><span className={b.l}>Deposit to start ({f.depositPct}%)</span><span className={b.v}>{formatZAR(t.deposit)}</span></div>}
              </div>
            </div>
            <div className={b.pFoot}>
              <span className={b.pCol}>
                <span className={b.k}>PAYMENT DETAILS</span>
                <span>{settings.invoicing.bank.name || '[Bank]'} · {settings.invoicing.bank.accountName || '[Account name]'}</span>
                <span>Acc {settings.invoicing.bank.accountNo || '[Account number]'} · Branch {settings.invoicing.bank.branchCode || '[Code]'}</span>
                <span>Reference: <span style={{ fontFamily: 'var(--font-mono)' }}>{previewNo}</span></span>
              </span>
              <span className={b.pCol}><span className={b.k}>NOTES</span><span className={b.pNotes}>{f.notes}</span></span>
            </div>
          </article>
        </aside>
      </div>
    </>
  );
}
