export function formatYen(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return `¥${rounded.toLocaleString("ja-JP")}`;
  return `¥${rounded.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}`;
}

export function formatPoints(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}
