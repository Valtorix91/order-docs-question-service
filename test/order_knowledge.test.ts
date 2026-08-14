import assert from "node:assert/strict";
import test from "node:test";
import { classifyQuestion } from "../src/order_knowledge.js";

test("routes a tracking question to fulfillment guidance", () => {
  assert.equal(classifyQuestion("When may we share the carrier tracking link?"), "fulfillment");
});

test("routes a tax question to receipt guidance", () => {
  assert.equal(classifyQuestion("Where does the customer see the tax total?"), "receipts");
});
