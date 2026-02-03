type RateRecord = { count: number; resetAt: number };

const ipMap = new Map<string, RateRecord>();

export function rateLimit(ip: string, limit: number, windowMs: number): { ok: boolean; resetIn: number } {
  const now = Date.now();
  const rec = ipMap.get(ip);

  if (!rec || now > rec.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, resetIn: windowMs };
  }

  if (rec.count >= limit) {
    return { ok: false, resetIn: rec.resetAt - now };
  }

  rec.count += 1;
  ipMap.set(ip, rec);
  return { ok: true, resetIn: rec.resetAt - now };
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
