import { ChevronDown, X } from "lucide-react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import Select, {
  components,
  type ClearIndicatorProps,
  type DropdownIndicatorProps,
  type GroupBase,
  type StylesConfig,
} from "react-select";

import type { SelectOption } from "@/types/api.types";

import { FormFieldShell } from "./FormFieldShell";

type AppSelectProps<T extends FieldValues> = {
  label: string;
  name: Path<T>;
  control: Control<T>;
  options: SelectOption[];
  placeholder?: string;
  isClearable?: boolean;
  isDisabled?: boolean;
  isSearchable?: boolean;
};

/* ── Custom indicators ────────────────────────── */

function DropdownIndicator(props: DropdownIndicatorProps<SelectOption, false, GroupBase<SelectOption>>) {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronDown className="text-muted-foreground" size={16} />
    </components.DropdownIndicator>
  );
}

function ClearIndicator(props: ClearIndicatorProps<SelectOption, false, GroupBase<SelectOption>>) {
  return (
    <components.ClearIndicator {...props}>
      <X className="text-muted-foreground hover:text-foreground" size={14} />
    </components.ClearIndicator>
  );
}

/* ── Theme-aware styles ───────────────────────── */

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "2.25rem",
    borderRadius: "calc(var(--radius) * 0.8)",
    borderColor: state.isFocused
      ? "var(--ring)"
      : "var(--input)",
    backgroundColor: "var(--background)",
    boxShadow: state.isFocused
      ? "0 0 0 2px color-mix(in srgb, var(--ring), transparent 75%)"
      : "none",
    fontSize: "0.875rem",
    transition: "border-color 0.15s, box-shadow 0.15s",
    cursor: "pointer",
    "&:hover": {
      borderColor: state.isFocused
        ? "var(--ring)"
        : "var(--border)",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 10px",
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--foreground)",
    fontSize: "0.875rem",
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--muted-foreground)",
    fontSize: "0.875rem",
  }),
  input: (base) => ({
    ...base,
    color: "var(--foreground)",
    fontSize: "0.875rem",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 8px",
    color: "var(--muted-foreground)",
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: "0 4px",
    cursor: "pointer",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
    borderRadius: "calc(var(--radius) * 0.8)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--popover)",
    boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
    marginTop: "4px",
  }),
  menuList: (base) => ({
    ...base,
    padding: "4px",
  }),
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
    color: state.isSelected
      ? "var(--primary-foreground)"
      : "var(--popover-foreground)",
    fontWeight: state.isSelected ? 500 : 400,
    "&:active": {
      backgroundColor: state.isSelected
        ? "var(--primary)"
        : "var(--muted)",
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: "var(--muted-foreground)",
    fontSize: "0.875rem",
  }),
};

/* ── Component ────────────────────────────────── */

export function AppSelect<T extends FieldValues>({
  label,
  name,
  control,
  options,
  placeholder = "Chọn...",
  isClearable = false,
  isDisabled = false,
  isSearchable = true,
}: AppSelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected = options.find((option) => option.value === field.value) ?? null;

        return (
          <FormFieldShell label={label} error={fieldState.error?.message}>
            <Select<SelectOption, false>
              components={{ DropdownIndicator, ClearIndicator }}
              isClearable={isClearable}
              isDisabled={isDisabled}
              isSearchable={isSearchable}
              noOptionsMessage={() => "Không tìm thấy"}
              options={options}
              placeholder={placeholder}
              styles={selectStyles}
              value={selected}
              onChange={(option) => field.onChange(option?.value ?? "")}
            />
          </FormFieldShell>
        );
      }}
    />
  );
}
