/** ["a", "b", "c"] -> "a, b and c" (no serial comma, as in British English). */
export function joinWithAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
