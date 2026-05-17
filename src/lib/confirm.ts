import { createElement, useEffect, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

type ConfirmIntent = "danger" | "warning" | "primary";

export type ConfirmActionOptions = {
  title: ReactNode;
  description: ReactNode;
  confirmText: string;
  cancelText?: string;
  intent?: ConfirmIntent;
};

type ConfirmDialogProps = Required<ConfirmActionOptions> & {
  onClose: (confirmed: boolean) => void;
};

function ConfirmDialog({ title, description, confirmText, cancelText, intent, onClose }: ConfirmDialogProps) {
  useEffect(() => {
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const cancelButton = document.querySelector<HTMLButtonElement>("[data-hrm-confirm-cancel='true']");

    document.body.style.overflow = "hidden";
    cancelButton?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [onClose]);

  return createElement(
    "div",
    { className: "hrm-confirm-overlay" },
    createElement(
      "div",
      {
        "aria-modal": true,
        className: `hrm-confirm-dialog hrm-confirm-dialog--${intent}`,
        role: "dialog",
      },
      createElement("h2", { className: "hrm-confirm-title" }, title),
      createElement("div", { className: "hrm-confirm-desc" }, description),
      createElement(
        "div",
        { className: "hrm-confirm-actions" },
        createElement(
          "button",
          {
            className: "hrm-confirm-button hrm-confirm-button--cancel",
            "data-hrm-confirm-cancel": "true",
            onClick: () => onClose(false),
            type: "button",
          },
          cancelText,
        ),
        createElement(
          "button",
          {
            className: `hrm-confirm-button hrm-confirm-button--${intent}`,
            onClick: () => onClose(true),
            type: "button",
          },
          confirmText,
        ),
      ),
    ),
  );
}

export async function confirmAction({
  title,
  description,
  confirmText,
  cancelText = "Hủy",
  intent = "primary",
}: ConfirmActionOptions) {
  if (typeof document === "undefined") {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const container = document.createElement("div");
    let root: Root | null = createRoot(container);
    let settled = false;

    const close = (confirmed: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(confirmed);
      window.setTimeout(() => {
        root?.unmount();
        root = null;
        container.remove();
      }, 0);
    };

    document.body.appendChild(container);
    root.render(
      createElement(ConfirmDialog, {
        cancelText,
        confirmText,
        description,
        intent,
        onClose: close,
        title,
      }),
    );
  });
}

export function confirmDelete(target = "bản ghi này") {
  return confirmAction({
    title: `Xóa ${target}?`,
    description: "Thao tác này cần được xác nhận trước khi thực hiện.",
    confirmText: "Xóa",
    intent: "danger",
  });
}

export function confirmLockAttendance(period = "kỳ chấm công này") {
  return confirmAction({
    title: `Khóa ${period}?`,
    description: "Dữ liệu chấm công đã khóa sẽ không thể chỉnh sửa nếu chưa mở khóa theo quyền quản trị.",
    confirmText: "Khóa chấm công",
    intent: "warning",
  });
}

export function confirmLockPayroll(period = "kỳ lương này") {
  return confirmAction({
    title: `Khóa ${period}?`,
    description: "Khóa kỳ lương sẽ cố định bảng lương trước khi gửi phiếu lương và xuất file ngân hàng.",
    confirmText: "Khóa lương",
    intent: "warning",
  });
}

export function confirmUnlockPayroll(period = "kỳ lương này") {
  return confirmAction({
    title: `Mở khóa ${period}?`,
    description: "Chỉ nên mở khóa kỳ lương sau khi có phê duyệt của người có thẩm quyền.",
    confirmText: "Mở khóa lương",
    intent: "warning",
  });
}

export function confirmSendPayslip(target = "nhân viên này") {
  return confirmAction({
    title: `Gửi phiếu lương cho ${target}?`,
    description: "Hệ thống sẽ tạo phiếu lương PDF và gửi tới email của nhân viên.",
    confirmText: "Gửi phiếu lương",
    intent: "primary",
  });
}

export function confirmBulkSendEmail(total?: number) {
  const target = total ? `${total} nhân viên` : "nhân viên đã chọn";

  return confirmAction({
    title: `Gửi phiếu lương cho ${target}?`,
    description: "Các email sẽ được đưa vào hàng đợi; email lỗi cần gửi lại từ log email.",
    confirmText: "Gửi email",
    intent: "warning",
  });
}

export function confirmImportExcel(fileName = "file Excel đã chọn") {
  return confirmAction({
    title: `Nhập ${fileName}?`,
    description: "Hệ thống sẽ kiểm tra cột dữ liệu và từ chối các dòng thiếu thông tin bắt buộc.",
    confirmText: "Nhập Excel",
    intent: "warning",
  });
}

export function confirmResetAttendancePayroll(period = "kỳ đang chọn") {
  return confirmAction({
    title: `Reset chấm công và bảng lương ${period}?`,
    description: "Thao tác này sẽ xóa dữ liệu chấm công, bảng lương và chi tiết lương của kỳ này để nhập test lại.",
    confirmText: "Reset dữ liệu",
    intent: "danger",
  });
}

export function confirmExportBankFile(bankName = "ngân hàng đã chọn") {
  return confirmAction({
    title: `Xuất file chuyển khoản cho ${bankName}?`,
    description: "Chỉ nên xuất file chuyển khoản từ kỳ lương đã khóa.",
    confirmText: "Xuất file",
    intent: "primary",
  });
}

export function confirmResetPassword(userName = "người dùng này") {
  return confirmAction({
    title: `Đặt lại mật khẩu cho ${userName}?`,
    description: "Người dùng sẽ cần đăng nhập bằng mật khẩu mới sau khi đặt lại.",
    confirmText: "Đặt lại mật khẩu",
    intent: "warning",
  });
}

export function confirmChangeEmployeeStatus(employeeName = "nhân viên này", status = "trạng thái mới") {
  return confirmAction({
    title: `Đổi ${employeeName} sang ${status}?`,
    description: "Thay đổi trạng thái có thể ảnh hưởng tới chấm công, bảng lương và quyền hiển thị.",
    confirmText: "Đổi trạng thái",
    intent: "warning",
  });
}
