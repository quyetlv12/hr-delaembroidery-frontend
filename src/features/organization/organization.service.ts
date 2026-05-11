import { api, unwrapApiResponse } from "@/services/api";
import type { ApiResponse } from "@/types/api.types";

import type { OrganizationFormValues } from "./organization.schema";
import type { Department, Position } from "./organization.types";

export async function getDepartments() {
  const response = await api.get<ApiResponse<Department[]>>("/organization/departments");
  return unwrapApiResponse(response.data);
}

export async function getDepartment(id: string) {
  const response = await api.get<ApiResponse<Department>>(`/organization/departments/${id}`);
  return unwrapApiResponse(response.data);
}

export async function createDepartment(values: OrganizationFormValues) {
  const response = await api.post<ApiResponse<Department>>("/organization/departments", toDepartmentPayload(values));
  return unwrapApiResponse(response.data);
}

export async function updateDepartment(id: string, values: OrganizationFormValues) {
  const response = await api.put<ApiResponse<Department>>(
    `/organization/departments/${id}`,
    toDepartmentPayload(values),
  );
  return unwrapApiResponse(response.data);
}

export async function deleteDepartment(id: string) {
  const response = await api.delete<ApiResponse<{ id: string }>>(`/organization/departments/${id}`);
  return unwrapApiResponse(response.data);
}

export async function getPositions() {
  const response = await api.get<ApiResponse<Position[]>>("/organization/positions");
  return unwrapApiResponse(response.data);
}

export async function getPosition(id: string) {
  const response = await api.get<ApiResponse<Position>>(`/organization/positions/${id}`);
  return unwrapApiResponse(response.data);
}

export async function createPosition(values: OrganizationFormValues) {
  const response = await api.post<ApiResponse<Position>>("/organization/positions", toPositionPayload(values));
  return unwrapApiResponse(response.data);
}

export async function updatePosition(id: string, values: OrganizationFormValues) {
  const response = await api.put<ApiResponse<Position>>(`/organization/positions/${id}`, toPositionPayload(values));
  return unwrapApiResponse(response.data);
}

export async function deletePosition(id: string) {
  const response = await api.delete<ApiResponse<{ id: string }>>(`/organization/positions/${id}`);
  return unwrapApiResponse(response.data);
}

function toDepartmentPayload(values: OrganizationFormValues) {
  return {
    code: values.code,
    name: values.name,
    description: values.description || undefined,
  };
}

function toPositionPayload(values: OrganizationFormValues) {
  return {
    code: values.code,
    name: values.name,
    departmentId: values.departmentId || undefined,
  };
}
