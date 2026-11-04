// Address checks used before the server fetches a web page for an owner, so the feature can't be pointed at the
// server's own network. Pure, so it can be tested.

/**
 * The IPv4 address hidden inside an IPv6 one, or null. `new URL('http://[::ffff:127.0.0.1]')` rewrites the address as
 * `::ffff:7f00:1`, so the dotted form alone is not enough: the hex forms of mapped (::ffff:), compatible (::),
 * NAT64 (64:ff9b::) and 6to4 (2002:) addresses all point at a v4 host and must be judged by that host.
 */
function embeddedV4(v: string): string | null {
  const [head, tail, ...extra] = v.split('::');
  if (extra.length) return null;
  const side = (x: string) => (x ? x.split(':') : []);
  const a = side(head);
  const b = tail === undefined ? [] : side(tail);
  const groups = tail === undefined ? a : [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  const n = groups.map((g) => parseInt(g, 16));
  const v4 = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  if (n.slice(0, 5).every((x) => x === 0) && (n[5] === 0xffff || n[5] === 0)) return v4(n[6], n[7]); // ::ffff:a.b.c.d and ::a.b.c.d
  if (n[0] === 0x64 && n[1] === 0xff9b && n.slice(2, 6).every((x) => x === 0)) return v4(n[6], n[7]); // 64:ff9b::a.b.c.d
  if (n[0] === 0x2002) return v4(n[1], n[2]); // 6to4
  return null;
}

export function isPrivateIp(ip: string): boolean {
  const v = ip.trim().toLowerCase();
  if (v.includes(':')) {
    if (v === '::' || v === '::1') return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    const embedded = embeddedV4(v);
    if (embedded) return isPrivateIp(embedded);
    return v.startsWith('fc') || v.startsWith('fd') || /^fe[89ab]/.test(v) || v.startsWith('ff');
  }
  const p = v.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true; // not an address we understand
  const [a, b] = p;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    a >= 224
  );
}

/** Adds https:// when the owner typed a bare address, and rejects anything that isn't a web address. */
export function normaliseUrl(raw: string): URL | null {
  const t = raw.trim();
  if (!t || /\s/.test(t)) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    if (u.username || u.password) return null;
    return u;
  } catch {
    return null;
  }
}
