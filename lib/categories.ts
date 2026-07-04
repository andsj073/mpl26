import type { CSSProperties } from "react";

// Kategorifärger från reveal-presentationens palett: pasteller på mörk
// botten (stad=blå, strand=grön, bil=korall, ungdom=violett, mat=guld),
// kompletterade i samma familj för sport/shopping/annat.

export type Category =
  | "utflykt"
  | "mat"
  | "bar"
  | "kultur"
  | "strand"
  | "sport"
  | "shopping"
  | "annat";

export const CATEGORIES: Record<
  Category,
  { label: string; color: string }
> = {
  utflykt: { label: "Utflykt", color: "#f0736a" },
  mat: { label: "Mat", color: "#f2b544" },
  bar: { label: "Bar & vin", color: "#c77dff" },
  kultur: { label: "Kultur", color: "#6ec1e4" },
  strand: { label: "Strand", color: "#52d6a5" },
  sport: { label: "Sport", color: "#5ee0d8" },
  shopping: { label: "Shopping", color: "#ff8fb1" },
  annat: { label: "Annat", color: "#9aa3b2" },
};

/** Tonad pill-stil som presentationens .daytag: färgad text, svag
 *  bakgrund och ram i samma kulör. */
export function pillStyle(color: string): CSSProperties {
  return {
    color,
    backgroundColor: `${color}1f`,
    border: `1px solid ${color}59`,
  };
}
