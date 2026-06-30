import assert from "node:assert/strict";
import test from "node:test";
import { parseSaleInput } from "../src/app/actions/sale-core.ts";

test("solo conserva el payload mínimo de una venta", () => {
  assert.deepEqual(parseSaleInput({
    org_id: "org-atacada",
    customer_name: " Ana ",
    payment_method: "efectivo",
    discount: 999,
    items: [{ product_id: "product-1", quantity: 2, unit_price: 0.01 }],
  }), {
    customer_name: "Ana",
    payment_method: "efectivo",
    items: [{ product_id: "product-1", quantity: 2 }],
  });
});

test("rechaza ventas vacías o cantidades inválidas", () => {
  assert.equal(parseSaleInput({ customer_name: "", payment_method: "efectivo", items: [] }), null);
  assert.equal(parseSaleInput({ customer_name: "", payment_method: "efectivo", items: [{ product_id: "p", quantity: -1 }] }), null);
  assert.equal(parseSaleInput({ customer_name: "", payment_method: "otro", items: [{ product_id: "p", quantity: 1 }] }), null);
});
