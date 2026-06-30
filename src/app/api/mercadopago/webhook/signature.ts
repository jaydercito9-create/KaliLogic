import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMercadoPagoSignature(signature: string, requestId: string, dataId: string, secret: string) {
  const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=", 2)));
  if (!parts.ts || !parts.v1 || !requestId || !secret) return false;
  const expected = createHmac("sha256", secret).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`).digest();
  const received = Buffer.from(parts.v1, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
