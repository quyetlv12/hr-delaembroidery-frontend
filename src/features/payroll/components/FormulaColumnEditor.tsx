import { Calculator } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import type { PayrollFormulaColumn } from "@/features/payroll/payroll.types";
import { cn } from "@/lib/utils";

const PAYROLL_VARIABLES = [
  { key: "thucHuong", name: "Thực hưởng" },
  { key: "luongBHXH", name: "Lương BHXH" },
  { key: "congChuan", name: "Công chuẩn" },
  { key: "ngayCong", name: "Ngày công" },
  { key: "baoHiemNgay", name: "Bảo hiểm ngày" },
  { key: "luongNgayThucHuong", name: "Lương ngày" },
  { key: "phuCapTrachNhiem", name: "P.Cấp trách nhiệm" },
  { key: "phuCapAnCa", name: "P.Cấp ăn ca" },
  { key: "phuCapDienThoai", name: "P.Cấp đ.thoại" },
  { key: "anCaMacDinh", name: "Ăn ca mặc định" },
  { key: "dienThoaiMacDinh", name: "Điện thoại mặc định" },
  { key: "phuCapKpi", name: "P.Cấp KPI" },
  { key: "phuCapKhac", name: "P.Cấp khác" },
  { key: "thuongLe", name: "Thưởng lễ" },
  { key: "luongCoDinh", name: "Lương cố định" },
  { key: "trachNhiem", name: "Trách nhiệm" },
  { key: "anCa", name: "Ăn ca" },
  { key: "dienThoai", name: "Điện thoại" },
  { key: "kpi", name: "KPI" },
  { key: "tongLuongNgay", name: "Tổng lương ngày" },
  { key: "luongThang", name: "Lương tháng" },
  { key: "luongTangCa", name: "Lương tăng ca" },
  { key: "tongLuong", name: "Tổng lương" },
  { key: "bhxhCongTy", name: "BHXH công ty" },
  { key: "bhxhNhanVien", name: "BHXH NLĐ" },
  { key: "thueTNCN", name: "Thuế TNCN" },
  { key: "tongGiamTru", name: "Tổng giảm trừ" },
  { key: "thucNhan", name: "Thực nhận" },
];

const CLOSED_SUGGESTION_STATE = {
  isOpen: false,
  filter: "",
  triggerStart: 0,
  cursorPos: 0,
  activeIndex: 0,
};

type SuggestionState = typeof CLOSED_SUGGESTION_STATE;

export function FormulaColumnEditor({
  columnFormulas,
  onChange,
}: {
  columnFormulas: PayrollFormulaColumn[];
  onChange: (index: number, formula: string) => void;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [suggestionState, setSuggestionState] = useState<SuggestionState>(
    CLOSED_SUGGESTION_STATE,
  );

  const filteredVariables = useMemo(() => {
    const filter = normalizeSearchTerm(suggestionState.filter);
    if (!filter) {
      return PAYROLL_VARIABLES;
    }

    return PAYROLL_VARIABLES.filter((variable) => {
      return (
        normalizeSearchTerm(variable.name).includes(filter) ||
        normalizeSearchTerm(variable.key).includes(filter)
      );
    });
  }, [suggestionState.filter]);

  const handleVariableInsert = (variableKey: string) => {
    const targetIndex = focusedIndex ?? 0;
    const currentFormula = columnFormulas[targetIndex]?.formula ?? "";

    if (suggestionState.isOpen && focusedIndex !== null) {
      const nextFormula =
        currentFormula.slice(0, suggestionState.triggerStart) +
        variableKey +
        currentFormula.slice(suggestionState.cursorPos);
      const nextCursorPos = suggestionState.triggerStart + variableKey.length;

      onChange(targetIndex, nextFormula);
      setSuggestionState(CLOSED_SUGGESTION_STATE);
      focusInputAt(targetIndex, nextCursorPos);
      return;
    }

    const separator =
      currentFormula && !/[+\-*/(]\s*$/.test(currentFormula) ? " + " : "";
    const nextFormula = `${currentFormula}${separator}${variableKey}`;
    onChange(targetIndex, nextFormula);
    setFocusedIndex(targetIndex);
    focusInputAt(targetIndex, nextFormula.length);
  };

  const handleInputChange = (
    index: number,
    value: string,
    selectionStart: number | null,
  ) => {
    onChange(index, value);
    setFocusedIndex(index);
    updateSuggestionState(value, selectionStart);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestionState.isOpen) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionState((current) => ({
        ...current,
        activeIndex: filteredVariables.length
          ? (current.activeIndex + 1) % filteredVariables.length
          : 0,
      }));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSuggestionState((current) => ({
        ...current,
        activeIndex: filteredVariables.length
          ? (current.activeIndex - 1 + filteredVariables.length) %
            filteredVariables.length
          : 0,
      }));
      return;
    }

    if (
      (event.key === "Enter" || event.key === "Tab") &&
      filteredVariables[suggestionState.activeIndex]
    ) {
      event.preventDefault();
      handleVariableInsert(filteredVariables[suggestionState.activeIndex].key);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSuggestionState(CLOSED_SUGGESTION_STATE);
    }
  };

  const updateSuggestionState = (
    value: string,
    selectionStart: number | null,
  ) => {
    if (selectionStart === null) {
      setSuggestionState(CLOSED_SUGGESTION_STATE);
      return;
    }

    const trigger = getFieldSuggestionTrigger(value, selectionStart);
    if (!trigger) {
      setSuggestionState(CLOSED_SUGGESTION_STATE);
      return;
    }

    setSuggestionState({
      isOpen: true,
      filter: trigger.filter,
      triggerStart: trigger.start,
      cursorPos: selectionStart,
      activeIndex: 0,
    });
  };

  const focusInputAt = (index: number, cursorPos: number) => {
    window.requestAnimationFrame(() => {
      const input = inputRefs.current[index];
      input?.focus();
      input?.setSelectionRange(cursorPos, cursorPos);
    });
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-12">
      <aside className="lg:sticky lg:top-[76px] lg:col-span-4 lg:h-fit lg:self-start">
        <div className="relative max-h-[calc(100vh-96px)] overflow-y-auto rounded-lg border border-primary/20 bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="absolute right-0 top-0 p-2 opacity-5">
            <Calculator size={40} />
          </div>
          <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/70">
            <span className="h-1 w-1 rounded-full bg-primary" />
            Thư viện trường dữ liệu
          </p>
          <div className="flex flex-wrap gap-2">
            {PAYROLL_VARIABLES.map((variable) => (
              <button
                className="group flex cursor-grab items-center gap-2 rounded-md border border-border bg-slate-50 px-2.5 py-2 text-[12px] font-bold text-slate-700 transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:cursor-grabbing dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                draggable
                key={variable.key}
                title={`Kéo hoặc click để chèn: ${variable.key}`}
                type="button"
                onClick={() => handleVariableInsert(variable.key)}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", variable.key);
                  event.dataTransfer.effectAllowed = "copy";
                }}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-white text-[10px] shadow-sm ring-1 ring-black/5 dark:bg-slate-800">
                  #
                </span>
                {variable.name}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] italic text-muted-foreground/60">
            * Nhấn ô công thức rồi gõ{" "}
            <code className="font-bold text-primary">{"{"}</code> để bật gợi ý
            hoặc kéo trường vào.
          </p>
        </div>
      </aside>

      <div className="grid gap-5 lg:col-span-8 lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto lg:pr-1">
        {columnFormulas.map((category, index) => (
          <div
            className={cn(
              "group relative flex flex-col gap-5 rounded-lg border bg-white p-6 transition duration-200 dark:bg-slate-950",
              focusedIndex === index
                ? "border-primary/50 shadow-lg shadow-primary/5 ring-1 ring-primary/20"
                : "border-border shadow-sm hover:border-primary/20",
            )}
            key={`${category.key}-${index}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50/70 px-4 py-3 dark:bg-slate-900/40">
              <div>
                <h4 className="mt-1 text-base font-bold text-foreground">
                  {category.name}
                </h4>
              </div>
              {/* <code className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-bold text-primary dark:bg-slate-950">
                {category.key}
              </code> */}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Cấu trúc công thức
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 transition-colors group-focus-within:text-primary">
                  <Calculator size={20} />
                </div>
                <input
                  className={cn(
                    "h-14 w-full rounded-lg border border-border pl-12 pr-14 font-mono text-base font-bold outline-none transition duration-200",
                    focusedIndex === index
                      ? "border-primary/30 bg-primary/5 text-primary ring-4 ring-primary/10"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300",
                  )}
                  placeholder="Gõ { để gợi ý trường dữ liệu..."
                  ref={(node) => {
                    inputRefs.current[index] = node;
                  }}
                  value={category.formula}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setSuggestionState(CLOSED_SUGGESTION_STATE);
                    }, 120);
                  }}
                  onChange={(event) => {
                    handleInputChange(
                      index,
                      event.target.value,
                      event.target.selectionStart,
                    );
                  }}
                  onDragLeave={(event) => {
                    event.currentTarget.classList.remove(
                      "ring-8",
                      "ring-primary/20",
                      "border-primary",
                    );
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.currentTarget.classList.add(
                      "ring-8",
                      "ring-primary/20",
                      "border-primary",
                    );
                    setFocusedIndex(index);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.currentTarget.classList.remove(
                      "ring-8",
                      "ring-primary/20",
                      "border-primary",
                    );
                    const data = event.dataTransfer.getData("text/plain");
                    if (data) {
                      const start =
                        event.currentTarget.selectionStart ??
                        category.formula.length;
                      const end =
                        event.currentTarget.selectionEnd ??
                        category.formula.length;
                      const nextValue =
                        category.formula.slice(0, start) +
                        data +
                        category.formula.slice(end);
                      onChange(index, nextValue);
                      focusInputAt(index, start + data.length);
                    }
                  }}
                  onFocus={(event) => {
                    setFocusedIndex(index);
                    updateSuggestionState(
                      event.currentTarget.value,
                      event.currentTarget.selectionStart,
                    );
                  }}
                  onKeyDown={handleInputKeyDown}
                />

                {suggestionState.isOpen && focusedIndex === index && (
                  <div className="absolute left-10 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-white p-1 shadow-2xl duration-200 animate-in fade-in zoom-in-95 dark:bg-slate-900">
                    <div className="p-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      Gợi ý trường
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredVariables.length > 0 ? (
                        filteredVariables.map((variable, variableIndex) => (
                          <button
                            className={cn(
                              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary",
                              variableIndex === suggestionState.activeIndex &&
                                "bg-primary/10 text-primary",
                            )}
                            key={variable.key}
                            type="button"
                            onClick={() => handleVariableInsert(variable.key)}
                            onMouseDown={(event) => event.preventDefault()}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                              #
                            </span>
                            <div className="flex min-w-0 flex-col">
                              <span>{variable.name}</span>
                              <span className="truncate text-[10px] text-muted-foreground">
                                {variable.key}
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          Không tìm thấy trường nào
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-50/50 px-4 py-3 dark:bg-slate-900/40">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <span className="text-[10px] font-bold">=</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {category.name || "Mục này"}
                  </span>
                  <span className="text-slate-400">=</span>
                  {category.formula ? (
                    <div className="flex flex-wrap items-center gap-1 font-mono text-[13px] font-bold text-primary">
                      {category.formula
                        .split(/([+\-*/()])/)
                        .map((part, partIndex) => {
                          const variable = PAYROLL_VARIABLES.find(
                            (item) => item.key === part.trim(),
                          );
                          if (variable) {
                            return (
                              <span
                                className="rounded-md bg-primary/10 px-1.5 py-0.5"
                                key={`${part}-${partIndex}`}
                              >
                                {variable.name}
                              </span>
                            );
                          }
                          return (
                            <span key={`${part}-${partIndex}`}>{part}</span>
                          );
                        })}
                    </div>
                  ) : (
                    <span className="text-sm italic text-slate-400">
                      Chưa có công thức
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getFieldSuggestionTrigger(value: string, cursorPos: number) {
  const textBeforeCursor = value.slice(0, cursorPos);
  const match = textBeforeCursor.match(/(\{\{?)([^+\-*/(){}\s]*)$/);

  if (!match) {
    return null;
  }

  return {
    filter: match[2],
    start: cursorPos - match[0].length,
  };
}

function normalizeSearchTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
