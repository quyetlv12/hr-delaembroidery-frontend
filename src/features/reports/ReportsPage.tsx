import { FileDown } from "lucide-react";

import { Button } from "@/components/common/Button";
import { ModulePlaceholder } from "@/components/common/ModulePlaceholder";
import { RequirePermission } from "@/components/common/RequirePermission";
import { permissions } from "@/constants/permissions";
import { showInfo } from "@/lib/toast";

export function ReportsPage() {
  return (
    <ModulePlaceholder
      actions={
        <RequirePermission permission={permissions.reportsRead}>
          <Button onClick={() => showInfo("Chức năng xuất báo cáo chưa được cấu hình")}>
            <FileDown size={18} />
            Xuất báo cáo
          </Button>
        </RequirePermission>
      }
      description="Xem báo cáo nhân sự, chấm công, bảng lương, chuyển khoản và email phiếu lương."
      emptyDescription="Báo cáo sẽ hiển thị khi đã có dữ liệu nhân viên, chấm công, lương và chuyển khoản."
      emptyTitle="Chưa có báo cáo"
      title="Báo cáo"
    />
  );
}
