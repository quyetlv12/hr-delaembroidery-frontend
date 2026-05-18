import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PayrollEmployeeViewColumn } from "@/features/employee-view-settings/employee-view-settings.types";

import { payrollColumnLabels } from "../payroll-column-metadata";
import type { PayrollFormulaColumn, PayrollFormulaColumnKey, PayrollFormulaSetting } from "../payroll.types";

type PayrollFormulaRowProps = {
  formulaSetting?: PayrollFormulaSetting;
  visibleColumns: PayrollEmployeeViewColumn[];
};

type FormulaVariableInfo = {
  key: string;
  label: string;
  sourceColumnName?: string;
};

type FormulaUsageInfo = {
  key: PayrollFormulaColumnKey;
  name: string;
  formula: string;
};

type PayrollFormulaInfo = {
  columnName: string;
  formulaLabel: string;
  adminFormula?: string;
  outputAliases: string[];
  variables: FormulaVariableInfo[];
  usedBy: FormulaUsageInfo[];
};

export function PayrollFormulaRow({ formulaSetting, visibleColumns }: PayrollFormulaRowProps) {
  const visibleColumnSet = new Set(visibleColumns);
  const formulaInfoByColumn = buildFormulaInfoByColumn(formulaSetting?.columnFormulas);

  return (
    <TooltipProvider delayDuration={120}>
      <tr className="whitespace-nowrap bg-amber-50 text-center text-[11px] italic text-muted-foreground">
        {payrollFormulaLabels.filter(([column]) => visibleColumnSet.has(column)).map(([column, label]) => (
          <FormulaInfoHeaderCell fallbackLabel={label} info={formulaInfoByColumn.get(column)} key={column} />
        ))}
      </tr>
    </TooltipProvider>
  );
}

function FormulaInfoHeaderCell({
  fallbackLabel,
  info,
}: {
  fallbackLabel: string;
  info?: PayrollFormulaInfo;
}) {
  const label = info?.formulaLabel ?? fallbackLabel;
  const hasDetails = Boolean(info?.adminFormula || info?.variables.length || info?.usedBy.length);

  if (!info || !hasDetails) {
    return <th className="whitespace-nowrap border border-border px-2 py-2 font-medium">{label}</th>;
  }

  return (
    <th className="whitespace-nowrap border border-border px-2 py-2 font-medium">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="mx-auto flex max-w-full items-center justify-center gap-1 rounded px-1 text-center whitespace-nowrap transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            type="button"
          >
            <span className="block max-w-full font-mono">{label}</span>
            <Info className="shrink-0 opacity-70" size={12} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          align="start"
          className="max-w-[420px] border border-border bg-card p-3 text-left text-card-foreground shadow-xl"
          side="top"
          sideOffset={8}
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-foreground">{info.columnName}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Công thức đang áp dụng từ admin</p>
              <code className="mt-1 block rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-primary">
                {info.adminFormula ?? "Cột dữ liệu đầu vào"}
              </code>
            </div>

            <FormulaTooltipSection title="Trường đang dùng">
              {info.variables.length > 0 ? (
                info.variables.map((variable) => (
                  <li key={variable.key}>
                    <code className="font-mono text-primary">{variable.key}</code>
                    <span> - {variable.label}</span>
                    {variable.sourceColumnName ? (
                      <span className="text-muted-foreground"> từ cột {variable.sourceColumnName}</span>
                    ) : null}
                  </li>
                ))
              ) : (
                <li>Không dùng trường khác.</li>
              )}
            </FormulaTooltipSection>

            {info.outputAliases.length > 0 ? (
              <FormulaTooltipSection title="Kết quả tạo ra">
                <li>
                  {info.outputAliases.map((alias) => (
                    <code className="mr-1 rounded bg-muted px-1 font-mono text-primary" key={alias}>
                      {alias}
                    </code>
                  ))}
                </li>
              </FormulaTooltipSection>
            ) : null}

            <FormulaTooltipSection title="Được dùng trong">
              {info.usedBy.length > 0 ? (
                info.usedBy.map((usage) => (
                  <li key={usage.key}>
                    <span className="font-medium text-foreground">{usage.name}</span>
                    <code className="ml-1 rounded bg-muted px-1 font-mono text-primary">{usage.formula}</code>
                  </li>
                ))
              ) : (
                <li>Không có cột nào phụ thuộc trực tiếp.</li>
              )}
            </FormulaTooltipSection>
          </div>
        </TooltipContent>
      </Tooltip>
    </th>
  );
}

function FormulaTooltipSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-1 text-[11px] leading-5 text-card-foreground">{children}</ul>
    </div>
  );
}

const payrollFormulaLabels: Array<[PayrollEmployeeViewColumn, string]> = [
  ["employeeCode", "(1)"],
  ["employeeName", "(2)"],
  ["departmentName", "(3)"],
  ["positionName", "(4)"],
  ["insuranceSalary", "(5)"],
  ["configuredSalary", "(6)"],
  ["fixedDailySalary", "(7)=(5)/công chuẩn"],
  ["responsibilityAllowance", "(8)"],
  ["mealAllowance", "(9)"],
  ["phoneAllowance", "(10)"],
  ["kpiAllowance", "(11)"],
  ["dailyTotal", "(12)=cộng(7:11)"],
  ["workDay", "(13)"],
  ["overtimeWorkDay", "(14)"],
  ["totalWorkDay", "(15)=(13)+(14)"],
  ["earnedSalary", "(16)=(12)*(13)"],
  ["overtimeTotal", "(17)"],
  ["grossSalary", "(18)=(16)+(17)"],
  ["employerInsuranceTotal", "(19)"],
  ["insuranceTotal", "(20)"],
  ["taxTotal", "(21)"],
  ["advanceTotal", "(22)"],
  ["deductionTotal", "(23)=(20)+(21)+(22)"],
  ["bonus", "(24)"],
  ["netSalary", "(25)=(18)-(23)+(24)"],
  ["dependentNote", "(26)"],
  ["email", "(27)"],
  ["status", "(28)"],
];

const payrollFormulaColumnKeys: PayrollFormulaColumnKey[] = [
  "fixedDailySalary",
  "responsibilityAllowance",
  "mealAllowance",
  "phoneAllowance",
  "kpiAllowance",
  "dailyTotal",
  "earnedSalary",
  "overtimeTotal",
  "grossSalary",
  "employerInsuranceTotal",
  "insuranceTotal",
  "taxTotal",
  "advanceTotal",
  "deductionTotal",
  "netSalary",
];

const formulaOutputAliases: Record<PayrollFormulaColumnKey, string[]> = {
  fixedDailySalary: ["luongCoDinh"],
  responsibilityAllowance: ["trachNhiem"],
  mealAllowance: ["anCa"],
  phoneAllowance: ["dienThoai"],
  kpiAllowance: ["kpi"],
  dailyTotal: ["luongNgay", "tongLuongNgay"],
  earnedSalary: ["luongCong", "luongThang", "luongTrongThang"],
  overtimeTotal: ["luongTangCa"],
  grossSalary: ["tongLuong"],
  employerInsuranceTotal: ["bhxhCongTy"],
  insuranceTotal: ["bhxhNhanVien"],
  taxTotal: ["thueTNCN"],
  advanceTotal: ["tamUng"],
  deductionTotal: ["tongGiamTru"],
  netSalary: ["thucNhan"],
};

const inputColumnVariables: Partial<Record<PayrollEmployeeViewColumn, string[]>> = {
  configuredSalary: ["thucHuong", "luongNgayThucHuong"],
  insuranceSalary: ["luongBHXH", "baoHiemNgay"],
  workDay: ["ngayCong"],
  overtimeWorkDay: ["soGioTangCa"],
  bonus: ["thuong"],
};

const payrollVariableNames: Record<string, string> = {
  thucHuong: "Thực hưởng",
  luongBHXH: "Lương BHXH",
  congChuan: "Công chuẩn",
  ngayCong: "Ngày công",
  baoHiemNgay: "Bảo hiểm ngày",
  luongNgayThucHuong: "Lương ngày thực hưởng",
  phuCapTrachNhiem: "Phụ cấp trách nhiệm",
  phuCapAnCa: "Phụ cấp ăn ca",
  phuCapDienThoai: "Phụ cấp điện thoại",
  anCaMacDinh: "Ăn ca mặc định",
  dienThoaiMacDinh: "Điện thoại mặc định",
  phuCapKpi: "Phụ cấp KPI",
  phuCapKhac: "Phụ cấp khác",
  phuCap: "Tổng phụ cấp",
  thuongLe: "Thưởng lễ",
  soGioTangCa: "Số giờ tăng ca",
  heSoOT: "Hệ số OT",
  tyLeBHXHNLD: "Tỷ lệ BHXH NLĐ",
  tyLeBHXHCongTy: "Tỷ lệ BHXH công ty",
  khauTruThue: "Khấu trừ thuế",
  tamUng: "Tạm ứng",
  luongCoDinh: "Lương cố định",
  trachNhiem: "Trách nhiệm",
  anCa: "Ăn ca",
  dienThoai: "Điện thoại",
  kpi: "KPI",
  luongNgay: "Lương ngày",
  tongLuongNgay: "Tổng lương ngày",
  luongCong: "Lương công",
  luongThang: "Lương tháng",
  luongTrongThang: "Lương trong tháng",
  luongTangCa: "Lương tăng ca",
  tongLuong: "Tổng lương",
  bhxhCongTy: "BHXH công ty",
  bhxhNhanVien: "BHXH NLĐ",
  thueTNCN: "Thuế TNCN",
  tongGiamTru: "Tổng giảm trừ",
  thuong: "Thưởng",
  thucNhan: "Thực nhận",
};

function buildFormulaInfoByColumn(columnFormulas: PayrollFormulaColumn[] = []) {
  const formulaByKey = new Map(columnFormulas.map((formula) => [formula.key, formula]));
  const sourceByVariable = buildVariableSourceMap();
  const usedByColumn = buildFormulaUsageMap(columnFormulas, sourceByVariable);
  const infoByColumn = new Map<PayrollEmployeeViewColumn, PayrollFormulaInfo>();

  for (const [column, fallbackLabel] of payrollFormulaLabels) {
    const formula = isPayrollFormulaColumnKey(column) ? formulaByKey.get(column) : undefined;
    const formulaVariables = formula ? getFormulaVariables(formula.formula) : [];
    const variables = formulaVariables.map((variableKey) => {
      const source = sourceByVariable.get(variableKey);
      return {
        key: variableKey,
        label: payrollVariableNames[variableKey] ?? (source?.column ? payrollColumnLabels[source.column] : variableKey),
        sourceColumnName: source?.column ? payrollColumnLabels[source.column] : undefined,
      };
    });
    const outputAliases = [
      ...(inputColumnVariables[column] ?? []),
      ...(isPayrollFormulaColumnKey(column) ? [column, ...(formulaOutputAliases[column] ?? [])] : []),
    ];

    infoByColumn.set(column, {
      columnName: payrollColumnLabels[column],
      formulaLabel: formula ? `${getFormulaIndexLabel(fallbackLabel)}=${compactFormula(formula.formula)}` : fallbackLabel,
      adminFormula: formula?.formula,
      outputAliases,
      variables,
      usedBy: usedByColumn.get(column) ?? [],
    });
  }

  return infoByColumn;
}

function buildVariableSourceMap() {
  const sourceByVariable = new Map<string, { column: PayrollEmployeeViewColumn }>();

  for (const [column, variables] of Object.entries(inputColumnVariables) as Array<
    [PayrollEmployeeViewColumn, string[]]
  >) {
    for (const variable of variables) {
      sourceByVariable.set(variable, { column });
    }
  }

  for (const key of payrollFormulaColumnKeys) {
    sourceByVariable.set(key, { column: key });
    for (const alias of formulaOutputAliases[key]) {
      sourceByVariable.set(alias, { column: key });
    }
  }

  return sourceByVariable;
}

function buildFormulaUsageMap(
  columnFormulas: PayrollFormulaColumn[],
  sourceByVariable: Map<string, { column: PayrollEmployeeViewColumn }>,
) {
  const usedByColumn = new Map<PayrollEmployeeViewColumn, FormulaUsageInfo[]>();

  for (const formula of columnFormulas) {
    for (const variable of getFormulaVariables(formula.formula)) {
      const source = sourceByVariable.get(variable);
      if (!source || source.column === formula.key) {
        continue;
      }

      const usages = usedByColumn.get(source.column) ?? [];
      if (!usages.some((usage) => usage.key === formula.key)) {
        usages.push({
          key: formula.key,
          name: formula.name || payrollColumnLabels[formula.key],
          formula: formula.formula,
        });
      }
      usedByColumn.set(source.column, usages);
    }
  }

  return usedByColumn;
}

function getFormulaVariables(formula: string) {
  const matches = formula.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  return Array.from(new Set(matches)).filter((variable) => payrollVariableNames[variable] || variable in payrollColumnLabels);
}

function isPayrollFormulaColumnKey(column: PayrollEmployeeViewColumn): column is PayrollFormulaColumnKey {
  return payrollFormulaColumnKeys.includes(column as PayrollFormulaColumnKey);
}

function getFormulaIndexLabel(label: string) {
  return label.match(/^\(\d+\)/)?.[0] ?? label;
}

function compactFormula(formula: string) {
  return formula.length > 34 ? `${formula.slice(0, 31)}...` : formula;
}
