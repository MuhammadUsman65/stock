export function formatPrice(price, decimals = 2) {
  if (price == null) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
}

export function formatChange(value, isPercent = false) {
  if (value == null) return "—";
  const sign = value >= 0 ? "+" : "";
  return isPercent
    ? `${sign}${value.toFixed(2)}%`
    : `${sign}${value.toFixed(2)}`;
}

export function formatVolume(v) {
  if (v == null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toString();
}

export function changeColor(value) {
  if (value > 0) return "var(--positive)";
  if (value < 0) return "var(--negative)";
  return "var(--text-secondary)";
}

export function isMarketOpen() {
  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const day = et.getDay();
  const mins = et.getHours() * 60 + et.getMinutes();
  // Mon–Fri, 9:30 AM – 4:00 PM ET
  return day >= 1 && day <= 5 && mins >= 570 && mins < 960;
}

export function sentimentColor(label) {
  if (label === "positive") return "var(--positive)";
  if (label === "negative") return "var(--negative)";
  return "var(--text-muted)";
}
