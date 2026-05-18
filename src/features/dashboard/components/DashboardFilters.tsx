import { vi } from "date-fns/locale";
import { ChevronDown, Filter, RotateCcw, User } from "lucide-react";
import DatePicker from "react-datepicker";
import Select, { components, type DropdownIndicatorProps, type GroupBase, type StylesConfig } from "react-select";

import { smartDatePickerPopperModifiers, smartDatePickerPopperProps } from "@/components/form/datePickerPopper";

type EmployeeOption = {
  label: string;
  value: string;
};

type DashboardFiltersProps = {
  employeeId: string;
  fromDate: string;
  toDate: string;
  employeeOptions: EmployeeOption[];
  isLoadingEmployees?: boolean;
  onChange: (next: { employeeId: string; fromDate: string; toDate: string }) => void;
  onReset: () => void;
};

export function DashboardFilters({
  employeeId,
  fromDate,
  toDate,
  employeeOptions,
  isLoadingEmployees,
  onChange,
  onReset,
}: DashboardFiltersProps) {
  const selectedEmployee = employeeOptions.find((option) => option.value === employeeId) ?? null;
  const fromDateValue = parseDateValue(fromDate);
  const toDateValue = parseDateValue(toDate);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <Filter className="text-primary" size={16} />
          Bộ lọc
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:max-w-[820px]">
          {/* Employee select */}
          <FilterField label="Nhân viên" icon={<User size={14} />}>
            <Select<EmployeeOption, false>
              components={{ DropdownIndicator }}
              isClearable
              isLoading={isLoadingEmployees}
              isSearchable
              noOptionsMessage={() => "Không tìm thấy"}
              options={employeeOptions}
              placeholder="Tất cả nhân viên"
              styles={selectStyles}
              value={selectedEmployee}
              onChange={(option) =>
                onChange({ employeeId: option?.value ?? "", fromDate, toDate })
              }
            />
          </FilterField>

          {/* From date */}
          <FilterField label="Từ ngày">
            <DatePicker
              calendarClassName="hrm-datepicker"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              dateFormat="dd/MM/yyyy"
              locale={vi}
              maxDate={toDateValue ?? undefined}
              placeholderText="dd/mm/yyyy"
              popperClassName="hrm-datepicker-popper"
              popperModifiers={smartDatePickerPopperModifiers}
              popperPlacement="bottom-start"
              popperProps={smartDatePickerPopperProps}
              selected={fromDateValue}
              onChange={(date: Date | null) =>
                onChange({
                  employeeId,
                  fromDate: date ? formatDateValue(date) : "",
                  toDate,
                })
              }
            />
          </FilterField>

          {/* To date */}
          <FilterField label="Đến ngày">
            <DatePicker
              calendarClassName="hrm-datepicker"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              dateFormat="dd/MM/yyyy"
              locale={vi}
              minDate={fromDateValue ?? undefined}
              placeholderText="dd/mm/yyyy"
              popperClassName="hrm-datepicker-popper"
              popperModifiers={smartDatePickerPopperModifiers}
              popperPlacement="bottom-start"
              popperProps={smartDatePickerPopperProps}
              selected={toDateValue}
              onChange={(date: Date | null) =>
                onChange({
                  employeeId,
                  fromDate,
                  toDate: date ? formatDateValue(date) : "",
                })
              }
            />
          </FilterField>
        </div>

        <button
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          onClick={onReset}
          type="button"
        >
          <RotateCcw size={14} />
          Đặt lại
        </button>
      </div>
    </section>
  );
}

function FilterField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function DropdownIndicator(
  props: DropdownIndicatorProps<EmployeeOption, false, GroupBase<EmployeeOption>>,
) {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronDown className="text-muted-foreground" size={16} />
    </components.DropdownIndicator>
  );
}

const selectStyles: StylesConfig<EmployeeOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "2.5rem",
    borderRadius: "var(--radius)",
    borderColor: state.isFocused ? "var(--ring)" : "var(--border)",
    backgroundColor: "var(--card)",
    boxShadow: state.isFocused
      ? "0 0 0 2px color-mix(in srgb, var(--ring), transparent 80%)"
      : "none",
    fontSize: "0.875rem",
    cursor: "pointer",
    "&:hover": { borderColor: "var(--ring)" },
  }),
  valueContainer: (base) => ({ ...base, padding: "2px 12px" }),
  singleValue: (base) => ({ ...base, color: "var(--foreground)", fontSize: "0.875rem" }),
  placeholder: (base) => ({
    ...base,
    color: "var(--muted-foreground)",
    fontSize: "0.875rem",
  }),
  input: (base) => ({ ...base, color: "var(--foreground)", fontSize: "0.875rem" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 8px" }),
  clearIndicator: (base) => ({ ...base, padding: "0 4px", cursor: "pointer" }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--popover)",
    boxShadow: "0 12px 32px -10px rgba(15,23,42,0.25)",
    overflow: "hidden",
    marginTop: "4px",
  }),
  menuList: (base) => ({ ...base, padding: "4px" }),
  option: (base, state) => ({
    ...base,
    borderRadius: "calc(var(--radius) * 0.6)",
    fontSize: "0.875rem",
    padding: "8px 10px",
    cursor: "pointer",
    backgroundColor: state.isSelected
      ? "var(--primary)"
      : state.isFocused
        ? "var(--muted)"
        : "transparent",
    color: state.isSelected ? "var(--primary-foreground)" : "var(--popover-foreground)",
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: "var(--muted-foreground)",
    fontSize: "0.875rem",
  }),
};

function parseDateValue(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
