import { useQuery } from "@tanstack/react-query";
import { History, TrendingUp } from "lucide-react";

import { getEmployeeSalaryHistory } from "../employee.service";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

const sourceLabel: Record<string, string> = {
  form_update: "Sửa hồ sơ",
  manual_update: "Sửa trực tiếp",
  salary_increase: "Tăng lương",
};

const modeLabel: Record<string, string> = {
  amount: "Số tiền",
  percent: "Phần trăm",
};

export function SalaryHistoryPanel({ employeeId }: { employeeId: string }) {
  const historyQuery = useQuery({
    queryKey: ["employees", employeeId, "salary-history"],
    queryFn: () => getEmployeeSalaryHistory(employeeId),
    enabled: Boolean(employeeId),
  });

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <History size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Lịch sử tăng lương</h3>
          <p className="text-sm text-muted-foreground">Theo dõi các lần đổi lương của nhân viên.</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {historyQuery.isLoading ? (
          <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
            Đang tải lịch sử lương...
          </p>
        ) : null}

        {!historyQuery.isLoading && (historyQuery.data?.length ?? 0) === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
            Chưa có lịch sử tăng lương.
          </p>
        ) : null}

        {historyQuery.data?.slice(0, 6).map((item) => {
          const isIncrease = item.changeAmount >= 0;
          return (
            <div
              key={item.id}
              className="grid gap-3 rounded-md border border-border bg-background px-3 py-3 text-sm md:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                  <span>{sourceLabel[item.changeSource] ?? item.changeSource}</span>
                  <span className={isIncrease ? "text-emerald-700" : "text-destructive"}>
                    {isIncrease ? "+" : ""}
                    {currencyFormatter.format(item.changeAmount)}
                  </span>
                  {item.changePercent !== undefined ? (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {isIncrease ? "+" : ""}
                      {item.changePercent.toFixed(2)}%
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                  <span>{currencyFormatter.format(item.previousSalary)}</span>
                  <span>-&gt;</span>
                  <span className="font-medium text-foreground">{currencyFormatter.format(item.newSalary)}</span>
                  {item.changeMode ? <span>{modeLabel[item.changeMode] ?? item.changeMode}</span> : null}
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground md:justify-end">
                <TrendingUp size={15} />
                <span>{formatDateTime(item.createdAt)}</span>
                {item.changedByLoginCode ? <span>· {item.changedByLoginCode}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}
