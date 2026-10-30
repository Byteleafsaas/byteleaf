import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import { getBookingAvailability } from '@/lib/server/public';
import BookingWidget from './BookingWidget';
import s from './book.module.css';

export const metadata: Metadata = {
  title: 'byteleaf — Book a call',
  description: 'Choose a meeting type, a day and a slot. All times are in South African Standard Time (UTC+2).',
};

// Availability changes whenever someone books: render per request.
export const dynamic = 'force-dynamic';

export default async function Book() {
  const { availability, types } = await getBookingAvailability();
  return (
    <main>
      <section className={s.sec}>
        <div className={s.col}>
          <div className={s.head}>
            <span className="rise eyebrow">BOOK A MEETING</span>
            <h1 className={`rise d1 ${s.h1}`}>Pick a time that <span className="hl">suits you.</span></h1>
            <p className={`rise d2 ${s.sub}`}>Choose a meeting type, a day and a slot. All times are in South African Standard Time (UTC+2).</p>
          </div>
          <BookingWidget availability={availability} types={types} />
        </div>
      </section>
      <Footer variant="compact" />
    </main>
  );
}
