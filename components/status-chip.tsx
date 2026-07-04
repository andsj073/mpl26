import { personColor } from "@/lib/family";
import { pillStyle } from "@/lib/categories";

/** Chip för en persons aktivitetsstatus: tonad = planerar, solid = har gjort. */
export function StatusChip({
  person,
  status,
}: {
  person: string;
  status: number;
}) {
  const color = personColor(person);
  const style =
    status === 2
      ? {
          backgroundColor: color,
          color: "#0d0f14",
          border: `1px solid ${color}`,
        }
      : pillStyle(color);
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={style}
    >
      {person}
      {status === 2 && " ✓"}
    </span>
  );
}
