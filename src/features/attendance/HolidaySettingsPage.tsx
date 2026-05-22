import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CalendarDays, CalendarOff, Check, ChevronLeft, ChevronRight, Save, Trash2, Wand2 } from "lucide-react";
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
import { getVietnamDateParts } from "@/lib/vietnam-time";

import { getAttendanceSettings, getHolidaySettings, updateAttendanceSettings, updateHolidaySettings } from "./attendance.service";
import type { AttendanceSettings, UpdateHolidaySettingsInput } from "./attendance.types";

type HolidayDraft = UpdateHolidaySettingsInput["holidays"][number];

const maxHolidayAmount = 1_000_000_000;

const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const weekdayOffOptions = [
  { value: 1, label: "T2", name: "Thứ hai" },
  { value: 2, label: "T3", name: "Thứ ba" },
  { value: 3, label: "T4", name: "Thứ tư" },
  { value: 4, label: "T5", name: "Thứ năm" },
  { value: 5, label: "T6", name: "Thứ sáu" },
  { value: 6, label: "T7", name: "Thứ bảy" },
  { value: 0, label: "CN", name: "Chủ nhật" },
];
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

const defaultAttendanceSettings: AttendanceSettings = {
  morningStart: "07:30",
  morningEnd: "11:30",
  afternoonStart: "13:30",
  afternoonEnd: "17:30",
  nightStart: "18:00",
  nightEnd: "21:00",
  overtimeRate: 1.5,
  holidayRate: 2,
  weeklyDaysOff: [0],
};

export function HolidaySettingsPage() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(getVietnamDateParts().year);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const holidayQuery = useQuery({
    queryKey: ["holiday-settings", year],
    queryFn: () => getHolidaySettings(year),
  });
  const attendanceSettingsQuery = useQuery({
    queryKey: ["attendance-settings"],
    queryFn: getAttendanceSettings,
  });
  const attendanceSettings = { ...defaultAttendanceSettings, ...attendanceSettingsQuery.data };
  const weeklyDaysOff = normalizeWeeklyDaysOff(attendanceSettings.weeklyDaysOff);
  const savedHolidays = useMemo(
    () =>
      normalizeHolidayDrafts(
        (holidayQuery.data?.holidays ?? []).map((holiday) => ({
          date: holiday.date,
          name: holiday.name,
          isPaid: holiday.isPaid,
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
  const nameByDate = useMemo(
    () => new Map(selectedHolidays.map((holiday) => [holiday.date, holiday.name ?? ""])),
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
  const updateWeeklyDaysOffMutation = useMutation({
    mutationFn: (nextWeeklyDaysOff: number[]) =>
      updateAttendanceSettings({
        ...defaultAttendanceSettings,
        ...attendanceSettings,
        weeklyDaysOff: normalizeWeeklyDaysOff(nextWeeklyDaysOff),
      }),
    onSuccess(data) {
      queryClient.setQueryData(["attendance-settings"], data);
      showSuccess("Đã cập nhật ngày nghỉ hằng tuần");
      void queryClient.invalidateQueries({ queryKey: ["attendance-settings"] });
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
        ? [...currentHolidays, { date, isPaid: true, amount: 0 }]
        : currentHolidays.filter((holiday) => holiday.date !== date);
      return {
        ...current,
        [year]: normalizeHolidayDrafts(nextHolidays),
      };
    });
  };

  const applyDefaultHolidays = () => {
    const presets = getVietnamHolidayPresets(year);
    setDraftHolidaysByYear((current) => {
      const currentHolidays = current[year] ?? savedHolidays;
      const currentByDate = new Map(currentHolidays.map((holiday) => [holiday.date, holiday]));
      return {
        ...current,
        [year]: normalizeHolidayDrafts([
          ...presets.map((preset) => ({
            ...preset,
            amount: currentByDate.get(preset.date)?.amount ?? preset.amount,
            isPaid: currentByDate.get(preset.date)?.isPaid ?? preset.isPaid ?? true,
          })),
          ...currentHolidays.filter((holiday) => !presets.some((preset) => preset.date === holiday.date)),
        ]),
      };
    });
    showSuccess("Đã thêm các ngày lễ mặc định vào danh sách nháp");
  };

  const toggleWeeklyDayOff = (day: number) => {
    const currentSet = new Set(weeklyDaysOff);
    if (currentSet.has(day)) {
      currentSet.delete(day);
    } else {
      currentSet.add(day);
    }

    updateWeeklyDaysOffMutation.mutate(normalizeWeeklyDaysOff(Array.from(currentSet)));
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
              disabled={holidayQuery.isLoading || updateMutation.isPending}
              variant="secondary"
              onClick={applyDefaultHolidays}
            >
              <Wand2 size={17} />
              Ngày lễ mặc định
            </Button>
            <Button
              disabled={holidayQuery.isLoading || updateMutation.isPending || !hasChanges}
              onClick={() => updateMutation.mutate({ year, holidays: selectedHolidays })}
            >
              <Save size={18} />
              {updateMutation.isPending ? "Đang lưu..." : "Lưu ngày lễ"}
            </Button>
          </>
        }
        description="Đánh dấu ngày lễ để bảng lương tính riêng tiền lễ khi nhân viên có chấm công trong ngày đó."
        title="Ngày lễ"
      />

      {holidayQuery.isLoading ? (
        <LoadingState label="Đang tải ngày lễ..." />
      ) : holidayQuery.isError ? (
        <ErrorState message="Không tải được cấu hình ngày lễ." />
      ) : (
        <>
          <section className="rounded-lg border border-amber-200 bg-amber-50/70 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 md:px-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                  <CalendarOff size={19} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Ngày nghỉ hằng tuần</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Mặc định nghỉ Chủ nhật. Ngày lễ đã đánh dấu không tự cộng công cho toàn bộ nhân viên; ai có chấm
                    công trong ngày lễ thì được tính lương ngày lễ theo hệ số đang cài đặt.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {weekdayOffOptions.map((option) => {
                  const selected = weeklyDaysOff.includes(option.value);
                  return (
                    <button
                      className={cn(
                        "h-10 rounded-md border px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-500/30",
                        selected
                          ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                          : "border-amber-200 bg-background text-foreground hover:border-amber-400 hover:bg-amber-50",
                      )}
                      disabled={updateWeeklyDaysOffMutation.isPending || attendanceSettingsQuery.isLoading}
                      key={option.value}
                      title={option.name}
                      type="button"
                      onClick={() => toggleWeeklyDayOff(option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <HolidayMetric icon={<CalendarDays size={18} />} label="Năm" value={String(year)} />
            <HolidayMetric label="Ngày đã chọn" value={String(selectedDates.length)} />
            <HolidayMetric label="Tháng có ngày lễ" value={String(countSelectedMonths(selectedDates))} />
            <HolidayMetric
              label="Hệ số lương ngày lễ"
              value={`x${formatPlainNumber(attendanceSettings.holidayRate)}`}
            />
            <HolidayMetric
              icon={<Banknote size={18} />}
              label="Tổng tiền cộng thêm"
              value={formatCurrency(totalHolidayAmount)}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            {monthNames.map((monthName, monthIndex) => (
              <MonthCalendar
                key={`${year}-${monthIndex}`}
                monthIndex={monthIndex}
                monthName={monthName}
                activeDate={activeDate}
                amountByDate={amountByDate}
                nameByDate={nameByDate}
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
  nameByDate,
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
  nameByDate: Map<string, string>;
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
          const holidayName = nameByDate.get(date) || `Ngày lễ ${formatDisplayDate(date)}`;
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
                    title={`${holidayName} - ${formatCurrency(amount)}`}
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
                    <PopoverTitle>{holidayName}</PopoverTitle>
                    <PopoverDescription>
                      Ngày này được đánh dấu là ngày lễ. Nếu nhân viên có chấm công, hệ thống tính lương ngày lễ theo hệ
                      số đang cài đặt.
                    </PopoverDescription>
                  </PopoverHeader>
                  <button
                    className="mb-3 flex w-full items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    type="button"
                    onClick={() => onToggleDate(date)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded border border-emerald-500 bg-emerald-500 text-white">
                        <Check size={13} />
                      </span>
                      Đây là ngày lễ
                    </span>
                    <span className="text-xs text-emerald-700/70">Bấm để bỏ</span>
                  </button>
                  <label className="block">
                    <span className="text-xs font-medium text-muted-foreground">Tiền cộng thêm cố định</span>
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

function normalizeWeeklyDaysOff(days: number[]) {
  const normalized = Array.from(
    new Set(days.map((day) => Number(day)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)),
  ).sort((left, right) => left - right);

  return normalized.length > 0 ? normalized : [0];
}

function getVietnamHolidayPresets(year: number): HolidayDraft[] {
  const hungKingsDay = convertLunarToSolar(10, 3, year, 0, 7);
  const presets: HolidayDraft[] = [
    { date: formatDate(year, 1, 1), name: "Tết dương lịch", isPaid: true, amount: 0 },
    { date: formatDate(year, 4, 30), name: "Ngày Giải phóng miền Nam", isPaid: true, amount: 0 },
    { date: formatDate(year, 5, 1), name: "Quốc tế Lao động", isPaid: true, amount: 0 },
    { date: formatDate(year, 9, 2), name: "Quốc khánh", isPaid: true, amount: 0 },
  ];

  if (hungKingsDay) {
    presets.push({
      date: formatDate(hungKingsDay.year, hungKingsDay.month, hungKingsDay.day),
      name: "Giỗ Tổ Hùng Vương",
      isPaid: true,
      amount: 0,
    });
  }

  return normalizeHolidayDrafts(presets);
}

function convertLunarToSolar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  lunarLeap: number,
  timeZone: number,
) {
  let a11: number;
  let b11: number;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timeZone);
    b11 = getLunarMonth11(lunarYear, timeZone);
  } else {
    a11 = getLunarMonth11(lunarYear, timeZone);
    b11 = getLunarMonth11(lunarYear + 1, timeZone);
  }

  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) {
    off += 12;
  }

  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) {
      leapMonth += 12;
    }
    if (lunarLeap !== 0 && lunarMonth !== leapMonth) {
      return null;
    }
    if (lunarLeap !== 0 || off >= leapOff) {
      off += 1;
    }
  }

  return jdToDate(getNewMoonDay(k + off, timeZone) + lunarDay - 1);
}

function jdFromDate(day: number, month: number, year: number) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jd =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  if (jd < 2299161) {
    return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }

  return jd;
}

function jdToDate(jd: number) {
  let a: number;
  let b: number;
  let c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }

  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: b * 100 + d - 4800 + Math.floor(m / 10),
  };
}

function newMoon(k: number) {
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const dr = Math.PI / 180;
  const jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3;
  const meanNewMoon = jd1 + 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * dr);
  const m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
  const mpr = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
  const f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;
  let correction =
    (0.1734 - 0.000393 * t) * Math.sin(m * dr) +
    0.0021 * Math.sin(2 * dr * m) -
    0.4068 * Math.sin(mpr * dr) +
    0.0161 * Math.sin(2 * dr * mpr) -
    0.0004 * Math.sin(3 * dr * mpr) +
    0.0104 * Math.sin(2 * dr * f) -
    0.0051 * Math.sin((m + mpr) * dr) -
    0.0074 * Math.sin((m - mpr) * dr) +
    0.0004 * Math.sin((2 * f + m) * dr) -
    0.0004 * Math.sin((2 * f - m) * dr) -
    0.0006 * Math.sin((2 * f + mpr) * dr) +
    0.001 * Math.sin((2 * f - mpr) * dr) +
    0.0005 * Math.sin((2 * mpr + m) * dr);
  const deltaT =
    t < -11
      ? 0.001 +
        0.000839 * t +
        0.0002261 * t2 -
        0.00000845 * t3 -
        0.000000081 * t * t3
      : -0.000278 + 0.000265 * t + 0.000262 * t2;

  correction -= deltaT;
  return meanNewMoon + correction;
}

function getNewMoonDay(k: number, timeZone: number) {
  return Math.floor(newMoon(k) + 0.5 + timeZone / 24);
}

function sunLongitude(jdn: number) {
  const t = (jdn - 2451545) / 36525;
  const t2 = t * t;
  const dr = Math.PI / 180;
  const m = 357.5291 + 35999.0503 * t - 0.0001559 * t2 - 0.00000048 * t * t2;
  const l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
  const dl =
    (1.9146 - 0.004817 * t - 0.000014 * t2) * Math.sin(dr * m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * dr * m) +
    0.00029 * Math.sin(3 * dr * m);
  let longitude = (l0 + dl) * dr;
  longitude -= Math.PI * 2 * Math.floor(longitude / (Math.PI * 2));
  return longitude;
}

function getSunLongitude(dayNumber: number, timeZone: number) {
  return Math.floor((sunLongitude(dayNumber - 0.5 - timeZone / 24) / Math.PI) * 6);
}

function getLunarMonth11(year: number, timeZone: number) {
  const off = jdFromDate(31, 12, year) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number) {
  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let last: number;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i += 1;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);

  return i - 1;
}

function formatDisplayDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatPlainNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
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
      name: holiday.name?.trim() || undefined,
      isPaid: holiday.isPaid ?? true,
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
    .map((holiday) => `${holiday.date}:${holiday.name ?? ""}:${holiday.isPaid ?? true}:${holiday.amount}`)
    .join("|");
}
