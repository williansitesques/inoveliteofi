export const fixMojibake = (s: string): string => {
  try {
    // Reverte sequências Latin-1 interpretadas como UTF‑8
    // decodeURIComponent(escape(x)) é uma técnica comum para desfazer mojibake simples
    return decodeURIComponent(escape(s));
  } catch {
    return s;
  }
};

export function deepFix<T = any>(o: T): T {
  if (o == null) return o;
  if (typeof o === 'string') return fixMojibake(o) as any;
  if (Array.isArray(o)) return (o as any[]).map(deepFix) as any;
  if (typeof o === 'object') {
    const r: any = {};
    for (const k in o as any) r[k] = deepFix((o as any)[k]);
    return r;
  }
  return o;
}

