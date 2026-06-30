import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyMercadoPagoSignature } from "../src/app/api/mercadopago/webhook/signature.ts";

test("valida la firma HMAC de Mercado Pago y rechaza alteraciones", () => {
  const secret = "test-secret";
  const requestId = "request-1";
  const dataId = "ABC123";
  const ts = "1704908010";
  const hash = createHmac("sha256", secret).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest("hex");
  const signature = `ts=${ts},v1=${hash}`;
  assert.equal(verifyMercadoPagoSignature(signature, requestId, dataId, secret), true);
  assert.equal(verifyMercadoPagoSignature(signature, requestId, "otro", secret), false);
});
