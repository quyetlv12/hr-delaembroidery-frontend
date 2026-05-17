import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CalendarDays, Check, ChevronLeft, ChevronRight, Save, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import CurrencyInput from "react-currency-input-field";

import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { showApiError, showSuccess } from "@/lib/toast";

import { getHolidaySettings, updateHolidaySettings } from "./attendance.service";
import type { UpdateHolidaySettingsInput } from "./attendance.types";

type HolidayDraft = UpdateHolidaySettingsInput["holidays"][number];

const maxHolidayAmount = 1_000_000_000;

const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const monthNames = [
  "Tháng 01",
  "Tháng 02",
  "Tháng 03",
  "Tháng 04",
  "Tháng 05",
  "Tháng 06",
  "Tháng 07",
  "Tháng 08",
  "Tháng 09",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});
const calendarCurrencyFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

export function HolidaySettingsPage() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const holidayQuery = useQuery({
    queryKey: ["holiday-settings", year],
    queryFn: () => getHolidaySettings(year),
  });
  const savedHolidays = useMemo(
    () =>
      normalizeHolidayDrafts(
        (holidayQuery.data?.holidays ?? []).map((holiday) => ({
          date: holiday.date,
          amount: holiday.amount ?? 0,
        })),
      ),
    [holidayQuery.data],
  );
  const [draftHolidaysByYear, setDraftHolidaysByYear] = useState<Record<number, HolidayDraft[]>>({});
  const selectedHolidays = draftHolidaysByYear[year] ?? savedHolidays;
  const selectedDates = useMemo(() => selectedHolidays.map((holiday) => holiday.date), [selectedHolidays]);
  const selectedDateSet = useMemo(() => new Set(selectedDates), [selectedDates]);
  const amountByDate = useMemo(
    () => new Map(selectedHolidays.map((holiday) => [holiday.date, holiday.amount])),
    [selectedHolidays],
  );
  const totalHolidayAmount = useMemo(
    () => selectedHolidays.reduce((total, holiday) => total + holiday.amount, 0),
    [selectedHolidays],
  );
  const hasChanges = serializeHolidays(selectedHolidays) !== serializeHolidays(savedHolidays);
  const updateMutation = useMutation({
    mutationFn: updateHolidaySettings,
    onSuccess(data) {
      queryClient.setQueryData(["holiday-settings", data.year], data);
      setDraftHolidaysByYear((current) => {
        const next = { ...current };
        delete next[data.year];
        return next;
      });
      setActiveDate(null);
      showSuccess("Đã cập nhật ngày lễ");
      void queryClient.invalidateQueries({ queryKey: ["holiday-settings", data.year] });
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const toggleDate = (date: string) => {
    const willSelect = !selectedDateSet.has(date);
    setActiveDate(willSelect ? date : null);
    setDraftHolidaysByYear((current) => {
      const currentHolidays = current[year] ?? savedHolidays;
      const nextHolidays = willSelect
        ? [...currentHolidays, { date, amount: 0 }]
        : currentHolidays.filter((holiday) => holiday.date !== date);
      return {
        ...current,
        [year]: normalizeHolidayDrafts(nextHolidays),
      };
    });
  };

  const updateHolidayAmount = (date: string, amount: number) => {
    setDraftHolidaysByYear((current) => {
      const currentHolidays = current[year] ?? savedHolidays;
      if (!currentHolidays.some((holiday) => holiday.date === date)) {
        return current;
      }

      return {
        ...current,
        [year]: normalizeHolidayDrafts(
          currentHolidays.map((holiday) =>
            holiday.date === date ? { ...holiday, amount: sanitizeHolidayAmount(amount) } : holiday,
          ),
        ),
      };
    });
  };

  const handleYearChange = (nextYear: number) => {
    if (Number.isInteger(nextYear) && nextYear >= 2000 && nextYear <= 2100) {
      setActiveDate(null);
      setYear(nextYear);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <div className="flex items-center gap-2">
              <Button
                aria-label="Năm trước"
                className="h-9 w-9 px-0"
                variant="secondary"
                onClick={() => handleYearChange(year - 1)}
              >
                <ChevronLeft size={17} />
              </Button>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                Năm
                <input
                  className="h-9 w-28 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  max={2100}
                  min={2000}
                  type="number"
                  value={year}
                  onChange={(event) => handleYearChange(Number(event.target.value))}
                />
              </label>
              <Button
                aria-label="Năm sau"
                className="h-9 w-9 px-0"
                variant="secondary"
                onClick={() => handleYearChange(year + 1)}
              >
                <ChevronRight size={17} />
              </Button>
            </div>
            <Button
              disabled={holidayQuery.isLoading || updateMutation.isPending || !hasChanges}
              onClick={() => updateMutation.mutate({ year, holidays: selectedHolidays })}
            >
              <Save size={18} />
              {updateMutation.isPending ? "Đang lưu..." : "Lưu ngày lễ"}
            </Button>
          </>
        }
        description="Chọn ngày lễ dùng chung để hệ thống tự trừ khỏi công chuẩn khi preview chấm công và tính bảng lương."
        title="Ngày lễ"
      />

      {holidayQuery.isLoading ? (
        <LoadingState label="Đang tải ngày lễ..." />
      ) : holidayQuery.isError ? (
        <ErrorState message="Không tải được cấu hình ngày lễ." />
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <HolidayMetric icon={<CalendarDays size={18} />} label="Năm" value={String(year)} />
            <HolidayMetric label="Ngày đã chọn" value={String(selectedDates.length)} />
            <HolidayMetric label="Tháng có ngày lễ" value={String(countSelectedMonths(selectedDates))} />
            <HolidayMetric icon={<Banknote size={18} />} label="Tổng tiền ngày lễ" value={formatCurrency(totalHolidayAmount)} />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            {monthNames.map((monthName, monthIndex) => (
              <MonthCalendar
                key={`${year}-${monthIndex}`}
                monthIndex={monthIndex}
                monthName={monthName}
                activeDate={activeDate}
                amountByDate={amountByDate}
                selectedDateSet={selectedDateSet}
                year={year}
                onActiveDateChange={setActiveDate}
                onAmountChange={updateHolidayAmount}
                onToggleDate={toggleDate}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function HolidayMetric({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-sm">
      {icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
      ) : null}
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-card-foreground">{value}</p>
      </div>
    </div>
  );
}

function MonthCalendar({
  year,
  monthIndex,
  monthName,
  activeDate,
  amountByDate,
  selectedDateSet,
  onActiveDateChange,
  onAmountChange,
  onToggleDate,
}: {
  year: number;
  monthIndex: number;
  monthName: string;
  activeDate: string | null;
  amountByDate: Map<string, number>;
  selectedDateSet: Set<string>;
  onActiveDateChange: (date: string | null) => void;
  onAmountChange: (date: string, amount: number) => void;
  onToggleDate: (date: string) => void;
}) {
  const firstDay = new Date(year, monthIndex, 1);
  const leadingBlankDays = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: leadingBlankDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const selectedCount = Array.from({ length: daysInMonth }, (_, index) =>
    selectedDateSet.has(formatDate(year, monthIndex + 1, index + 1)),
  ).filter(Boolean).length;

  return (
    <div className="rounded-md border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-card-foreground">{monthName}</h2>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground">
          {selectedCount}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
        {weekdayLabels.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`blank-${index}`} className="aspect-square min-h-9" />;
          }

          const date = formatDate(year, monthIndex + 1, day);
          const isSelected = selectedDateSet.has(date);
          const isWeekend = new Date(year, monthIndex, day).getDay() === 0;
          const amount = amountByDate.get(date) ?? 0;
          const dayButtonClassName = cn(
            "relative flex aspect-square min-h-9 flex-col items-center justify-center rounded-md border px-1 text-sm font-semibold tabular-nums transition focus:outline-none focus:ring-2 focus:ring-ring/30",
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:border-primary/60 hover:bg-primary/5",
            isWeekend && !isSelected ? "bg-muted/50 text-muted-foreground" : "",
          );

          if (isSelected) {
            return (
              <Popover
                key={date}
                open={activeDate === date}
                onOpenChange={(open: boolean) => onActiveDateChange(open ? date : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    aria-pressed={isSelected}
                    className={dayButtonClassName}
                    title={`Ngày lễ ${formatDisplayDate(date)} - ${formatCurrency(amount)}`}
                    type="button"
                  >
                    <span className="leading-none">{day}</span>
                    <span className="mt-1 max-w-[calc(100%-4px)] truncate rounded-sm bg-primary-foreground/15 px-1 text-center text-[10px] font-bold leading-4 text-primary-foreground">
                      {formatCalendarCurrency(amount)}
                    </span>
                    <Check className="absolute right-1 top-1" size={11} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-72 p-3">
                  <PopoverHeader>
                    <PopoverTitle>Ngày lễ {formatDisplayDate(date)}</PopoverTitle>
                    <PopoverDescription>Nhập số tiền cộng cho ngày lễ này.</PopoverDescription>
                  </PopoverHeader>
                  <label className="block">
                    <span className="text-xs font-medium text-muted-foreground">Số tiền</span>
                    <CurrencyInput
                      allowDecimals={false}
                      allowNegativeValue={false}
                      autoFocus
                      className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2.5 text-sm font-semibold text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                      decimalSeparator=","
                      decimalsLimit={0}
                      groupSeparator="."
                      inputMode="numeric"
                      maxLength={13}
                      placeholder="0 đ"
                      suffix=" đ"
                      value={amount}
                      onValueChange={(nextValue) => onAmountChange(date, nextValue ? Number(nextValue) : 0)}
                    />
                  </label>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {formatCurrency(amount)}
                    </span>
                    <Button
                      className="h-8 px-2 text-destructive hover:text-destructive"
                      variant="ghost"
                      onClick={() => onToggleDate(date)}
                    >
                      <Trash2 size={14} />
                      Bỏ chọn
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            );
          }

          return (
            <button
              aria-pressed={isSelected}
              className={dayButtonClassName}
              key={date}
              title={`Chọn ${formatDisplayDate(date)}`}
              type="button"
              onClick={() => onToggleDate(date)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDisplayDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatCalendarCurrency(value: number) {
  return `${calendarCurrencyFormatter.format(value)}đ`;
}

function countSelectedMonths(dates: string[]) {
  return new Set(dates.map((date) => date.slice(0, 7))).size;
}

function normalizeHolidayDrafts(holidays: HolidayDraft[]) {
  const holidaysByDate = new Map<string, HolidayDraft>();

  for (const holiday of holidays) {
    const date = holiday.date.trim();
    if (!date) {
      continue;
    }
    holidaysByDate.set(date, {
      date,
      amount: sanitizeHolidayAmount(holiday.amount),
    });
  }

  return Array.from(holidaysByDate.values()).sort((first, second) => first.date.localeCompare(second.date));
}

function sanitizeHolidayAmount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(maxHolidayAmount, Math.max(0, Math.round(value)));
}

function serializeHolidays(holidays: HolidayDraft[]) {
  return normalizeHolidayDrafts(holidays)
    .map((holiday) => `${holiday.date}:${holiday.amount}`)
    .join("|");
}
