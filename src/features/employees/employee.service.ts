import { api, unwrapApiResponse } from "@/services/api";
import type { ApiResponse } from "@/types/api.types";

import type {
  Employee,
  EmployeeDocument,
  EmployeeListQuery,
  EmployeeSalaryHistory,
  SalaryIncreaseInput,
  SalaryIncreaseResult,
} from "./employee.types";
import type { EmployeeFormValues } from "./employee.schema";
import type { EmployeeFormOptions } from "./employee.types";

export async function getEmployees(query: EmployeeListQuery = {}) {
  const response = await api.get<ApiResponse<Employee[]>>("/employees", {
    params: query,
  });
  return unwrapApiResponse(response.data);
}

export async function getEmployee(id: string) {
  const response = await api.get<ApiResponse<Employee>>(`/employees/${normalizeEmployeeId(id)}`);
  return unwrapApiResponse(response.data);
}

export async function getEmployeeFormOptions() {
  const response = await api.get<ApiResponse<EmployeeFormOptions>>("/employees/form-options");
  return unwrapApiResponse(response.data);
}

export async function createEmployee(values: EmployeeFormValues) {
  const response = await api.post<ApiResponse<Employee>>("/employees", toEmployeePayload(values));
  return unwrapApiResponse(response.data);
}

export async function updateEmployee(id: string, values: EmployeeFormValues) {
  const response = await api.put<ApiResponse<Employee>>(`/employees/${normalizeEmployeeId(id)}`, toEmployeePayload(values));
  return unwrapApiResponse(response.data);
}

export async function uploadEmployeeAvatar(id: string, file: File) {
  const formData = new FormData();
  formData.append("avatar", file);
  const response = await api.post<ApiResponse<Employee>>(`/employees/${normalizeEmployeeId(id)}/avatar`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrapApiResponse(response.data);
}

export async function deleteEmployeeAvatar(id: string) {
  const response = await api.delete<ApiResponse<Employee>>(`/employees/${normalizeEmployeeId(id)}/avatar`);
  return unwrapApiResponse(response.data);
}

export async function getEmployeeDocuments(id: string) {
  const response = await api.get<ApiResponse<EmployeeDocument[]>>(`/employees/${normalizeEmployeeId(id)}/documents`);
  return unwrapApiResponse(response.data);
}

export async function getEmployeeSalaryHistory(id: string) {
  const response = await api.get<ApiResponse<EmployeeSalaryHistory[]>>(
    `/employees/${normalizeEmployeeId(id)}/salary-history`,
  );
  return unwrapApiResponse(response.data);
}

export async function getEmployeeSalaryHistories() {
  const response = await api.get<ApiResponse<EmployeeSalaryHistory[]>>("/employees/salary-history");
  return unwrapApiResponse(response.data);
}

export async function uploadEmployeeDocuments(id: string, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await api.post<ApiResponse<EmployeeDocument[]>>(`/employees/${normalizeEmployeeId(id)}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrapApiResponse(response.data);
}

export async function downloadEmployeeDocument(id: string, document: EmployeeDocument) {
  const response = await api.get<Blob>(`/employees/${normalizeEmployeeId(id)}/documents/${document.id}/download`, {
    responseType: "blob",
  });
  const blobUrl = URL.createObjectURL(response.data);
  const link = window.document.createElement("a");
  link.href = blobUrl;
  link.download = document.originalName;
  window.document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

export async function deleteEmployeeDocument(id: string, documentId: string) {
  const response = await api.delete<ApiResponse<{ id: string }>>(
    `/employees/${normalizeEmployeeId(id)}/documents/${documentId}`,
  );
  return unwrapApiResponse(response.data);
}

export async function updateEmployeeSalary(id: string, salary: number) {
  const response = await api.patch<ApiResponse<Employee>>(`/employees/${normalizeEmployeeId(id)}/salary`, { salary });
  return unwrapApiResponse(response.data);
}

export async function increaseEmployeeSalaries(values: SalaryIncreaseInput) {
  const response = await api.post<ApiResponse<SalaryIncreaseResult>>("/employees/salary-increase", values);
  return unwrapApiResponse(response.data);
}

export async function deleteEmployee(id: string) {
  const response = await api.delete<ApiResponse<{ id: string }>>(`/employees/${normalizeEmployeeId(id)}`);
  return unwrapApiResponse(response.data);
}

export function getEmployeeAssetUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  if (/^(https?:|data:|blob:)/.test(value)) {
    return value;
  }

  const baseUrl = new URL(String(api.defaults.baseURL ?? ""), window.location.origin);
  const assetPath = value.startsWith("/") ? value : `/${value}`;
  return `${baseUrl.origin}${assetPath}`;
}

function normalizeEmployeeId(id: string) {
  return id.split("/")[0] ?? "";
}

function toEmployeePayload(values: EmployeeFormValues) {
  const payload = { ...values };
  delete payload.avatar;

  return {
    ...payload,
    timekeepingCode: values.timekeepingCode || undefined,
    departmentId: values.departmentId || undefined,
    positionId: values.positionId || undefined,
    birthday: values.birthday || undefined,
    phone: values.phone || undefined,
    cccd: values.cccd || undefined,
    address: values.address || undefined,
    contractType: values.contractType || undefined,
    bankAccount: values.bankAccount || undefined,
    bankName: values.bankName || undefined,
    loginPassword: values.loginPassword || undefined,
    taxCode: values.taxCode || undefined,
    insuranceCode: values.insuranceCode || undefined,
    shiftCount: Number(values.shiftCount),
  };
}
