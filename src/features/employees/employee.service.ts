import { api, unwrapApiResponse } from "@/services/api";
import type { ApiResponse } from "@/types/api.types";

import type { Employee, EmployeeListQuery } from "./employee.types";
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

export async function deleteEmployee(id: string) {
  const response = await api.delete<ApiResponse<{ id: string }>>(`/employees/${normalizeEmployeeId(id)}`);
  return unwrapApiResponse(response.data);
}

function normalizeEmployeeId(id: string) {
  return id.split("/")[0] ?? "";
}

function toEmployeePayload(values: EmployeeFormValues) {
  return {
    ...values,
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
