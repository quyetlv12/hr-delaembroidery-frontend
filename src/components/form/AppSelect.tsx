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
    minHeight: "2.75rem",
    borderRadius: "var(--radius)",
    borderColor: state.isFocused
      ? "var(--ring)"
      : "var(--field-border)",
    backgroundColor: "var(--field-bg)",
    boxShadow: state.isFocused
      ? "var(--field-shadow), 0 0 0 4px color-mix(in srgb, var(--ring), transparent 85%)"
      : "var(--field-shadow)",
    fontSize: "0.875rem",
    transition: "background-color 0.15s, border-color 0.15s, box-shadow 0.15s",
    cursor: "pointer",
    "&:hover": {
      borderColor: state.isFocused
        ? "var(--ring)"
        : "var(--field-hover)",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "4px 12px",
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--foreground)",
    fontSize: "0.875rem",
    fontWeight: 500,
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--field-placeholder)",
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
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--popover)",
    boxShadow: "0 18px 48px -18px rgba(15, 23, 42, 0.35), 0 8px 18px -12px rgba(15, 23, 42, 0.24)",
    overflow: "hidden",
    marginTop: "6px",
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
