import { Fragment } from 'react';
import Link from 'next/link';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';
import { D } from '@/lib/law/content';

export default function MobileBar() {
  const { tel } = D;
  return (
<div className="lf-mbar" style={css("position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; gap: 8px; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: #F7F4EF; border-top: 1px solid #DCD3C5; box-shadow: 0 -10px 30px -20px rgba(31,28,24,.5)")}>
<a className="lf-b lf-b-line" href={`tel:${tel}`} style={css("flex: 1; min-height: 50px; padding: 0 10px")}>Call</a>
<Link className="lf-b lf-b-clay" href={R.contact} style={css("flex: 2.2; min-height: 50px; padding: 0 10px")}>Request a consultation</Link>
</div>
  );
}
