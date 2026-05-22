import { api, unwrapApiResponse } from "@/services/api";
import type { ApiResponse } from "@/types/api.types";

import type {
  PayrollFormulaHistoryEntry,
  PayrollFormulaSetting,
  PayrollFormulaTemplate,
  PayrollPayslipEmailResponse,
  PayrollPayslipTestEmailResult,
  PayrollRecordHistoryEntry,
  PayrollRecordUpdateInput,
  PayrollResponse,
} from "./payroll.types";

export async function getPayroll(month: number, year: number) {
  const response = await api.get<ApiResponse<PayrollResponse>>("/payroll", {
    params: { month, year },
  });
  return unwrapApiResponse(response.data);
}

export async function calculatePayroll(month: number, year: number, formulaSetting?: PayrollFormulaSetting) {
  const response = await api.post<ApiResponse<PayrollResponse>>("/payroll/calculate", {
    month,
    year,
    ...(formulaSetting ? { formulaSetting } : {}),
  });
  return unwrapApiResponse(response.data);
}

export async function restorePayrollBonuses(month: number, year: number) {
  const response = await api.post<ApiResponse<PayrollResponse>>("/payroll/restore-bonuses", {
    month,
    year,
  });
  return unwrapApiResponse(response.data);
}

export async function getPayrollFormulaSetting() {
  const response = await api.get<ApiResponse<PayrollFormulaSetting>>("/payroll/settings/formula");
  return unwrapApiResponse(response.data);
}

export async function updatePayrollFormulaSetting(values: PayrollFormulaSetting) {
  const response = await api.put<ApiResponse<PayrollFormulaSetting>>("/payroll/settings/formula", values);
  return unwrapApiResponse(response.data);
}

export async function getPayrollFormulaHistory() {
  const response = await api.get<ApiResponse<PayrollFormulaHistoryEntry[]>>("/payroll/settings/formula/history");
  return unwrapApiResponse(response.data);
}

export async function revertPayrollFormulaHistory(id: string) {
  const response = await api.post<ApiResponse<PayrollFormulaSetting>>(`/payroll/settings/formula/history/${id}/revert`);
  return unwrapApiResponse(response.data);
}

export async function getPayrollFormulaTemplates() {
  const response = await api.get<ApiResponse<PayrollFormulaTemplate[]>>("/payroll/settings/formula/templates");
  return unwrapApiResponse(response.data);
}

export async function savePayrollFormulaTemplate(input: {
  name: string;
  description?: string;
  setting: PayrollFormulaSetting;
}) {
  const response = await api.post<ApiResponse<PayrollFormulaTemplate>>("/payroll/settings/formula/templates", input);
  return unwrapApiResponse(response.data);
}

export async function applyPayrollFormulaTemplate(id: string) {
  const response = await api.post<ApiResponse<PayrollFormulaSetting>>(`/payroll/settings/formula/templates/${id}/apply`);
  return unwrapApiResponse(response.data);
}

export async function lockPayroll(periodId: string) {
  const response = await api.post<ApiResponse<PayrollResponse>>(`/payroll/periods/${periodId}/lock`);
  return unwrapApiResponse(response.data);
}

export async function unlockPayroll(periodId: string) {
  const response = await api.post<ApiResponse<PayrollResponse>>(`/payroll/periods/${periodId}/unlock`);
  return unwrapApiResponse(response.data);
}

export async function updatePayrollRecord(recordId: string, values: PayrollRecordUpdateInput) {
  const response = await api.patch<ApiResponse<PayrollResponse>>(`/payroll/records/${recordId}`, values);
  return unwrapApiResponse(response.data);
}

export async function getPayrollRecordHistory(periodId: string) {
  const response = await api.get<ApiResponse<PayrollRecordHistoryEntry[]>>(
    `/payroll/periods/${periodId}/record-history`,
  );
  return unwrapApiResponse(response.data);
}

export async function revertPayrollRecordHistory(historyId: string) {
  const response = await api.post<ApiResponse<PayrollResponse>>(`/payroll/record-history/${historyId}/revert`);
  return unwrapApiResponse(response.data);
}

export async function sendPayrollPayslipEmails(periodId: string, recordIds: string[]) {
  const response = await api.post<ApiResponse<PayrollPayslipEmailResponse>>(
    `/payroll/periods/${periodId}/payslip-emails`,
    { recordIds },
  );
  return unwrapApiResponse(response.data);
}

export async function sendPayrollPayslipTestEmail(recordId: string, email: string) {
  const response = await api.post<ApiResponse<PayrollPayslipTestEmailResult>>(
    `/payroll/records/${recordId}/payslip-test-email`,
    { email },
  );
  return unwrapApiResponse(response.data);
}

export async function exportPayrollTransferFile(periodId: string) {
  const response = await api.get<Blob>(`/payroll/periods/${periodId}/transfer-file`, {
    responseType: "blob",
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(await getBlobErrorMessage(response.data));
  }

  const fileName = getFileNameFromDisposition(response.headers["content-disposition"]) ?? "chuyen_tien_luong.xls";
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return fileName;
}

async function getBlobErrorMessage(payload: Blob) {
  try {
    const data = JSON.parse(await payload.text()) as ApiResponse<unknown>;
    return data.success ? "Xuất file chuyển tiền thất bại" : data.error.message;
  } catch {
    return "Xuất file chuyển tiền thất bại";
  }
}

function getFileNameFromDisposition(disposition?: string) {
  if (!disposition) {
    return undefined;
  }

  const fileName = disposition.match(/filename="?([^"]+)"?/)?.[1];
  return fileName ? decodeURIComponent(fileName) : undefined;
}
