import test from "node:test";
import assert from "node:assert/strict";
import { createMapLayout, moveBlock, wirePath, blockHeight } from "../src/map-layout.js";
const nodes = [
  { id: "form", kind: "component" }, { id: "route", kind: "route" },
  { id: "storage", kind: "table" }, { id: "list", kind: "component" }
];
test("wide maps place blocks in three functional columns", () => {
  const layout = createMapLayout(nodes, 760);
  assert.equal(layout.compact, false);
  assert.ok(layout.positions.get("form").x < layout.positions.get("route").x);
  assert.equal(layout.positions.get("form").x, layout.positions.get("list").x);
  assert.ok(layout.positions.get("form").y < layout.positions.get("list").y);
});
test("phone maps fit without horizontal scrolling and blocks do not overlap", () => {
  const layout = createMapLayout(nodes, 310);
  assert.equal(layout.compact, true);
  for (const [index, node] of nodes.entries()) {
    const position = layout.positions.get(node.id);
    assert.ok(position.x + layout.nodeWidth <= layout.width);
    if (index) assert.ok(position.y >= layout.positions.get(nodes[index - 1].id).y + blockHeight);
  }
});
test("pointer and keyboard moves stay inside the canvas after resize", () => {
  const layout = createMapLayout(nodes, 760);
  const move = moveBlock(layout, "form", -100, 5000);
  const updated = createMapLayout(nodes, 310, { form: move });
  const position = updated.positions.get("form");
  assert.ok(position.x >= 16);
  assert.ok(position.y + blockHeight <= updated.height - 16);
  assert.equal(moveBlock(layout, "missing", 0, 0), null);
});
test("wires follow moved endpoints and safely ignore unknown nodes", () => {
  const layout = createMapLayout(nodes, 760), edge = { source: "form", target: "route" };
  const before = wirePath(layout, edge);
  const next = createMapLayout(nodes, 760, { form: moveBlock(layout, "form", 120, 200) });
  assert.notEqual(wirePath(next, edge), before);
  assert.equal(wirePath(next, { source: "missing", target: "route" }), "");
  assert.ok(!wirePath(next, { source: "form", target: "form" }).includes("NaN"));
});
test("empty and unknown-kind manifests still produce a usable layout", () => {
  assert.equal(createMapLayout([], 0).width, 280);
  assert.equal(createMapLayout([{ id: "other", kind: "custom" }], NaN).positions.size, 1);
});
