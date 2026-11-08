/** Display and parse rupee amounts; API stores integer paise. */
export function paiseToRupeesInput(paise: number): string {
  if (!paise) return "";
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

export function rupeesInputToPaise(rupees: string): number {
  const n = Number.parseFloat(rupees.replace(/,/g, "").trim());
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}
