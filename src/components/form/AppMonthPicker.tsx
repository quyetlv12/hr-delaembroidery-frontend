import DatePicker from "react-datepicker";
import { vi } from "date-fns/locale";

import { smartDatePickerPopperModifiers, smartDatePickerPopperProps } from "./datePickerPopper";
import { FormFieldShell } from "./FormFieldShell";

type AppMonthPickerProps = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
};

export function AppMonthPicker({ label, value, onChange, placeholder }: AppMonthPickerProps) {
  return (
    <FormFieldShell label={label}>
      <DatePicker
        calendarClassName="hrm-datepicker hrm-month-picker"
        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        dateFormat="MM/yyyy"
        locale={vi}
        popperClassName="hrm-datepicker-popper"
        popperModifiers={smartDatePickerPopperModifiers}
        popperPlacement="bottom-end"
        popperProps={smartDatePickerPopperProps}
        placeholderText={placeholder}
        selected={value}
        showMonthYearPicker
        showFullMonthYearPicker
        onChange={(date: Date | null) => {
          if (date) {
            onChange(new Date(date.getFullYear(), date.getMonth(), 1));
          }
        }}
      />
    </FormFieldShell>
  );
}
