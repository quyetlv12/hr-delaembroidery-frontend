import type { ReactNode } from "react";

type ChartPanelProps = {
  title: string;
  children: ReactNode;
};

export function ChartPanel({ title, children }: ChartPanelProps) {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h2 className="mb-4 text-sm font-semibold text-card-foreground">{title}</h2>
      <div className="h-72">{children}</div>
    </section>
  );
}
