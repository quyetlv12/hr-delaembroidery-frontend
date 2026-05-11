import axios from "axios";
import { toast, type ExternalToast } from "sonner";

export type ToastId = string | number;

type ToastHandledError = {
  __toastHandled?: boolean;
};

const defaultToastOptions: ExternalToast = {
  duration: 4000,
};

export function showSuccess(message: string, options?: ExternalToast) {
  return toast.success(message, { ...defaultToastOptions, ...options });
}

export function showError(message: string, options?: ExternalToast) {
  return toast.error(message, { ...defaultToastOptions, ...options });
}

export function showWarning(message: string, options?: ExternalToast) {
  return toast.warning(message, { ...defaultToastOptions, ...options });
}

export function showInfo(message: string, options?: ExternalToast) {
  return toast.info(message, { ...defaultToastOptions, ...options });
}

export function showLoading(message: string, options?: ExternalToast) {
  return toast.loading(message, { duration: Infinity, ...options });
}

export function dismissToast(id?: ToastId) {
  toast.dismiss(id);
}

export function showApiError(error: unknown) {
  const handledError = error as ToastHandledError;
  if (handledError.__toastHandled) {
    return;
  }
  handledError.__toastHandled = true;

  if (!axios.isAxiosError(error)) {
    showError(error instanceof Error ? error.message : "Có lỗi không mong muốn");
    return;
  }

  const status = error.response?.status;
  const serverMessage = getServerMessage(error.response?.data);

  if (!error.response) {
    showError("Không kết nối được máy chủ", {
      description: "Vui lòng kiểm tra mạng hoặc trạng thái API.",
    });
    return;
  }

  const messages: Record<number, string> = {
    401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    403: "Bạn không có quyền thực hiện thao tác này.",
    404: "Không tìm thấy dữ liệu yêu cầu.",
    422: "Dữ liệu gửi lên không hợp lệ.",
    500: "Lỗi hệ thống. Vui lòng liên hệ quản trị viên.",
  };

  showError(messages[status ?? 0] ?? serverMessage ?? "Yêu cầu API thất bại", {
    description: status === 422 ? serverMessage : undefined,
  });
}

function getServerMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return undefined;
}
