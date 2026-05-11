type ErrorStateProps = {
  title?: string;
  message?: string;
};

export function ErrorState({
  title = "Không tải được dữ liệu",
  message = "Vui lòng thử lại hoặc liên hệ quản trị viên nếu lỗi tiếp tục xảy ra.",
}: ErrorStateProps) {
  return (
    <div className="rounded-md border border-danger/40 bg-card p-6">
      <h2 className="text-sm font-semibold text-danger">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
