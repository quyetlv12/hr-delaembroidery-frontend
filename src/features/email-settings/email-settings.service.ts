import { api, unwrapApiResponse } from "@/services/api";
import type { ApiResponse } from "@/types/api.types";

import type { EmailSettings, EmailTestInput, EmailTestResult, UpdateEmailSettingsInput } from "./email-settings.types";

export async function getEmailSettings() {
  const response = await api.get<ApiResponse<EmailSettings>>("/email-settings");
  return unwrapApiResponse(response.data);
}

export async function updateEmailSettings(values: UpdateEmailSettingsInput) {
  const response = await api.put<ApiResponse<EmailSettings>>("/email-settings", values);
  return unwrapApiResponse(response.data);
}

export async function sendTestEmail(values: EmailTestInput) {
  const response = await api.post<ApiResponse<EmailTestResult>>("/email-settings/test", values);
  return unwrapApiResponse(response.data);
}
