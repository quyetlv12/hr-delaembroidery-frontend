import { Spinner } from "@/components/ui/spinner";

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Đang tải dữ liệu..." }: LoadingStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card text-sm text-muted-foreground">
      <Spinner className="size-6 text-primary" />
      {label}
    </div>
  );
}
