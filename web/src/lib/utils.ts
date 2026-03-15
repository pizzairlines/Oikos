import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | null): string {
  if (!price) return "\u2014";
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(price) + " \u20ac";
}

export function formatPriceSqm(price: number | null): string {
  if (!price) return "\u2014";
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(price) + " \u20ac/m\u00b2";
}

export function formatArrondissement(arr: string | null): string {
  if (!arr || !arr.startsWith("750")) return arr || "Paris";
  const num = parseInt(arr.slice(3));
  return `Paris ${num}${num === 1 ? "er" : "e"}`;
}
