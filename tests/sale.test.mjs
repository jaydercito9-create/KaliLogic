import assert from "node:assert/strict";
import test from "node:test";
import { completeSale } from "../src/app/actions/sale-core.ts";

test("completa una venta con detalle y descuento de stock", async () => {
  const calls = [];
  const service = {
    from(table) {
      return {
        insert(payload) {
          calls.push([table, payload]);
          if (table === "sales") {
            return {
              select: () => ({
                single: async () => ({ data: { id: "sale-1", sale_number: 42 }, error: null }),
              }),
            };
          }
          return Promise.resolve({ error: null });
        },
      };
    },
    async rpc(name, payload) {
      calls.push([name, payload]);
      return { error: null };
    },
  };

  const result = await completeSale({
    org_id: "org-1",
    customer_name: "Ana",
    payment_method: "efectivo",
    discount: 5,
    items: [
      { product_id: "p-1", name: "Arroz", unit_price: 10, quantity: 2 },
      { product_id: "p-2", name: "Leche", unit_price: 4.5, quantity: 1 },
    ],
  }, "user-1", service);

  assert.deepEqual(result, {
    success: true,
    saleId: "sale-1",
    saleNumber: 42,
    total: 19.5,
  });
  assert.equal(calls[0][0], "sales");
  assert.deepEqual(calls[0][1], {
    organization_id: "org-1",
    customer_name: "Ana",
    subtotal: 24.5,
    discount: 5,
    total: 19.5,
    payment_method: "efectivo",
    status: "completed",
    created_by: "user-1",
  });
  assert.equal(calls[1][0], "sale_items");
  assert.equal(calls[1][1].length, 2);
  assert.deepEqual(calls.slice(2), [
    ["decrement_stock", { p_org_id: "org-1", p_product_id: "p-1", p_qty: 2 }],
    ["decrement_stock", { p_org_id: "org-1", p_product_id: "p-2", p_qty: 1 }],
  ]);
});
