export function formatUsd(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}
