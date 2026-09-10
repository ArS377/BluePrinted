export const mapGroups = [
  { label: "Interface", kinds: ["component"], tone: "iris" },
  { label: "Application", kinds: ["route", "service"], tone: "clay" },
  { label: "Data & services", kinds: ["table", "ai", "websocket"], tone: "teal" }
];
export const blockHeight = 116;
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
const groupFor = (node) => Math.max(0, mapGroups.findIndex((group) => group.kinds.includes(node.kind)));

export function createMapLayout(nodes, availableWidth, moves = {}) {
  const width = Math.max(280, Number.isFinite(availableWidth) ? availableWidth : 760);
  const compact = width < 580;
  const columns = mapGroups.map((_, column) => nodes.filter((node) => groupFor(node) === column));
  const nodeWidth = compact ? Math.min(280, width - 48) : (width - 112) / 3;
  const height = compact ? Math.max(220, nodes.length * 148 + 44) : Math.max(400, Math.max(...columns.map((items) => items.length)) * 156 + 126);
  const positions = new Map();
  columns.forEach((items, column) => items.forEach((node, row) => {
    const defaultPosition = compact
      ? { x: (width - nodeWidth) / 2, y: 28 + nodes.indexOf(node) * 148 }
      : { x: 24 + column * (nodeWidth + 32), y: 86 + row * 156 + (column === 1 ? 34 : 0) };
    const move = moves[node.id];
    positions.set(node.id, {
      x: clamp(move ? move.x * (width - nodeWidth) : defaultPosition.x, 16, width - nodeWidth - 16),
      y: clamp(move ? move.y * (height - blockHeight) : defaultPosition.y, compact ? 16 : 64, height - blockHeight - 16),
      column
    });
  }));
  return { width, height, nodeWidth, compact, columns, positions };
}

export function moveBlock(layout, id, x, y) {
  if (!layout.positions.has(id)) return null;
  return {
    x: clamp(x, 16, layout.width - layout.nodeWidth - 16) / (layout.width - layout.nodeWidth),
    y: clamp(y, layout.compact ? 16 : 64, layout.height - blockHeight - 16) / (layout.height - blockHeight)
  };
}

export function wirePath(layout, edge) {
  const source = layout.positions.get(edge.source), target = layout.positions.get(edge.target);
  if (!source || !target) return "";
  if (layout.compact || Math.abs(source.x - target.x) < layout.nodeWidth * 0.65) {
    const x1 = source.x + layout.nodeWidth, x2 = target.x + layout.nodeWidth;
    const y1 = source.y + blockHeight / 2, y2 = target.y + blockHeight / 2;
    const bend = Math.min(layout.width - 6, Math.max(x1, x2) + 26);
    return `M ${x1} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x2} ${y2}`;
  }
  const forward = target.x > source.x;
  const x1 = source.x + (forward ? layout.nodeWidth : 0), x2 = target.x + (forward ? 0 : layout.nodeWidth);
  const y1 = source.y + blockHeight / 2, y2 = target.y + blockHeight / 2;
  const middle = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}`;
}
