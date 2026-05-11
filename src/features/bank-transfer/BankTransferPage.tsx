import { Download } from "lucide-react";

import { Button } from "@/components/common/Button";
import { ModulePlaceholder } from "@/components/common/ModulePlaceholder";
import { RequirePermission } from "@/components/common/RequirePermission";
import { permissions } from "@/constants/permissions";
import { confirmExportBankFile } from "@/lib/confirm";
import { showWarning } from "@/lib/toast";

export function BankTransferPage() {
  const handleExportTransferFile = async () => {
    const confirmed = await confirmExportBankFile();
    if (confirmed) {
      showWarning("Chức năng xuất file chuyển khoản chưa được cấu hình");
    }
  };

  return (
    <ModulePlaceholder
      actions={
        <RequirePermission permission={permissions.bankTransferExport}>
          <Button onClick={handleExportTransferFile}>
            <Download size={18} />
            Xuất file chuyển khoản
          </Button>
        </RequirePermission>
      }
      description="Tạo file chuyển khoản Vietcombank, BIDV, MB Bank, ACB, Techcombank hoặc Vietinbank từ kỳ lương đã khóa."
      emptyDescription="Khóa kỳ lương trước khi tạo file chuyển khoản TXT, XLSX hoặc CSV."
      emptyTitle="Chưa có file chuyển khoản"
      title="Chuyển khoản ngân hàng"
    />
  );
}
