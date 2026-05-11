import { createElement, Fragment, type ReactNode } from "react";
import AlertConfirm, { type Dispatch } from "react-alert-confirm";

type ConfirmIntent = "danger" | "warning" | "primary";

export type ConfirmActionOptions = {
  title: ReactNode;
  description: ReactNode;
  confirmText: string;
  cancelText?: string;
  intent?: ConfirmIntent;
};

const confirmButtonStyle = {
  danger: "danger",
  warning: "primary",
  primary: "primary",
} as const;

AlertConfirm.config({
  cancelText: "Hủy",
  maskClosable: false,
  okText: "Xác nhận",
  zIndex: 1000,
});

function renderFooter(
  dispatch: Dispatch,
  confirmText: string,
  cancelText: string,
  intent: ConfirmIntent,
) {
  return createElement(
    Fragment,
    null,
    createElement(
      AlertConfirm.Button,
      {
        styleType: "default",
        onClick: () => dispatch(false),
      },
      cancelText,
    ),
    createElement(
      AlertConfirm.Button,
      {
        className: `hrm-confirm-button hrm-confirm-button--${intent}`,
        styleType: confirmButtonStyle[intent],
        onClick: () => dispatch(true),
      },
      confirmText,
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
  const [action] = await AlertConfirm({
    className: `hrm-confirm hrm-confirm--${intent}`,
    desc: description,
    footer: (dispatch: Dispatch) => renderFooter(dispatch, confirmText, cancelText, intent),
    title,
    type: "confirm",
  });

  return action === true;
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
