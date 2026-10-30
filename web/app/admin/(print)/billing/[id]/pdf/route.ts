import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/server/auth';
import { connectDB } from '@/lib/server/db';
import { BillingDocument } from '@/lib/server/models';
import { renderDocumentPdf } from '@/lib/server/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) return new NextResponse('Not found', { status: 404 });
  await connectDB();
  const doc = await BillingDocument.findById(id).lean();
  if (!doc) return new NextResponse('Not found', { status: 404 });

  try {
    const pdf = await renderDocumentPdf(id, `${doc.pdfVersion}-${new Date(doc.updatedAt as Date).getTime()}`);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="byteleaf-${doc.number ?? 'draft'}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    console.error('[pdf]', e);
    return new NextResponse('The PDF could not be generated.', { status: 500 });
  }
}
