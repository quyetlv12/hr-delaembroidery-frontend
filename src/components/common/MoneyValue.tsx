import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const toneClasses = {
  neutral: "bg-muted/60 text-muted-foreground ring-border/70",
  base: "bg-sky-50 text-sky-700 ring-sky-100",
  positive: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  negative: "bg-rose-50 text-rose-700 ring-rose-100",
  net: "bg-teal-50 text-primary ring-teal-100",
} as const;

type MoneyTone = keyof typeof toneClasses;

type MoneyValueProps = {
  value: number;
  tone?: MoneyTone;
  sign?: "none" | "plus" | "minus";
  className?: string;
};

export function MoneyValue({
  value,
  tone = "neutral",
  sign = "none",
  className,
}: MoneyValueProps) {
  const resolvedTone = value === 0 ? "neutral" : tone;

  return (
    <span
      className={cn(
        "inline-flex min-w-[92px] items-center justify-end rounded-md px-2 py-1 text-right text-[0.92em] font-semibold tabular-nums ring-1",
        toneClasses[resolvedTone],
        className,
      )}
    >
      {formatMoney(value, sign)}
    </span>
  );
}

function formatMoney(value: number, sign: MoneyValueProps["sign"]) {
  if (value === 0 || sign === "none") {
    return currencyFormatter.format(value);
  }

  const prefix = sign === "plus" ? "+" : "-";
  return `${prefix}${currencyFormatter.format(Math.abs(value))}`;
}
