import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Image, Trash2, Upload, X } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/common/Button";
import { showApiError, showSuccess } from "@/lib/toast";

import {
  deleteEmployeeAvatar,
  deleteEmployeeDocument,
  downloadEmployeeDocument,
  getEmployeeAssetUrl,
  getEmployeeDocuments,
} from "../employee.service";
import type { EmployeeDocument } from "../employee.types";

type EmployeeAttachmentPanelProps = {
  avatarFile: File | null;
  documentFiles: File[];
  employeeId: string;
  existingAvatarUrl?: string;
  isEdit: boolean;
  setAvatarFile: (file: File | null) => void;
  setDocumentFiles: (files: File[]) => void;
};

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

export function EmployeeAttachmentPanel({
  avatarFile,
  documentFiles,
  employeeId,
  existingAvatarUrl,
  isEdit,
  setAvatarFile,
  setDocumentFiles,
}: EmployeeAttachmentPanelProps) {
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const selectedAvatarPreviewUrl = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : undefined),
    [avatarFile],
  );

  useEffect(() => {
    return () => {
      if (selectedAvatarPreviewUrl) {
        URL.revokeObjectURL(selectedAvatarPreviewUrl);
      }
    };
  }, [selectedAvatarPreviewUrl]);

  const avatarPreviewUrl = selectedAvatarPreviewUrl ?? getEmployeeAssetUrl(existingAvatarUrl);
  const documentsQuery = useQuery({
    queryKey: ["employees", employeeId, "documents"],
    queryFn: () => getEmployeeDocuments(employeeId),
    enabled: isEdit && Boolean(employeeId),
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: () => deleteEmployeeAvatar(employeeId),
    onSuccess(employee) {
      showSuccess("Đã xóa ảnh đại diện");
      clearAvatarInput();
      queryClient.setQueryData(["employees", employeeId], employee);
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const documentDeleteMutation = useMutation({
    mutationFn: (documentId: string) => deleteEmployeeDocument(employeeId, documentId),
    onSuccess() {
      showSuccess("Đã xóa file hồ sơ");
      void queryClient.invalidateQueries({ queryKey: ["employees", employeeId, "documents"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const documentDownloadMutation = useMutation({
    mutationFn: (employeeDocument: EmployeeDocument) => downloadEmployeeDocument(employeeId, employeeDocument),
    onError(error) {
      showApiError(error);
    },
  });

  function clearAvatarInput() {
    setAvatarFile(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  }

  function clearDocumentInput() {
    setDocumentFiles([]);
    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Image size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">Avatar nhân viên</h3>
            <p className="text-sm text-muted-foreground">Ảnh đại diện là trường riêng với hồ sơ tài liệu.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          {avatarPreviewUrl ? (
            <img
              alt="Avatar nhân viên"
              className="h-24 w-24 rounded-lg border border-border object-cover"
              src={avatarPreviewUrl}
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-sm font-semibold text-muted-foreground">
              Ảnh
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <input
              ref={avatarInputRef}
              accept="image/*"
              className="sr-only"
              type="file"
              onChange={handleAvatarFileChange(setAvatarFile)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => avatarInputRef.current?.click()}>
                <Upload size={16} />
                Chọn avatar
              </Button>
              {avatarFile ? (
                <Button variant="ghost" onClick={clearAvatarInput}>
                  <X size={16} />
                  Bỏ chọn
                </Button>
              ) : null}
              {isEdit && !avatarFile && existingAvatarUrl ? (
                <Button
                  disabled={deleteAvatarMutation.isPending}
                  variant="danger"
                  onClick={() => deleteAvatarMutation.mutate()}
                >
                  <Trash2 size={16} />
                  Xóa avatar
                </Button>
              ) : null}
            </div>
            {avatarFile ? (
              <p className="truncate text-sm text-muted-foreground">
                Đã chọn: {avatarFile.name} · {formatFileSize(avatarFile.size)}
              </p>
            ) : null}
            {avatarFile ? (
              <p className="text-xs text-muted-foreground">Avatar sẽ được upload khi bấm Lưu nhân viên.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">File hồ sơ cá nhân</h3>
              <p className="text-sm text-muted-foreground">
                Upload nhiều file như hợp đồng, CCCD, thông tin cá nhân.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={documentInputRef}
              className="sr-only"
              multiple
              type="file"
              onChange={handleDocumentFilesChange(setDocumentFiles)}
            />
            <Button variant="secondary" onClick={() => documentInputRef.current?.click()}>
              <Upload size={16} />
              Chọn file
            </Button>
          </div>
        </div>

        {documentFiles.length > 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">File đang chọn ({documentFiles.length})</p>
              <Button size="sm" variant="ghost" onClick={clearDocumentInput}>
                <X size={14} />
                Bỏ chọn
              </Button>
            </div>
            <div className="space-y-2">
              {documentFiles.map((file) => (
                <DocumentRow
                  key={`${file.name}-${file.lastModified}`}
                  description={formatFileSize(file.size)}
                  name={file.name}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Các file này sẽ được upload khi bấm Lưu nhân viên.
            </p>
          </div>
        ) : null}

        {isEdit ? (
          <div className="mt-4 space-y-2">
            {documentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải danh sách hồ sơ...</p>
            ) : null}
            {!documentsQuery.isLoading && (documentsQuery.data?.length ?? 0) === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                Chưa có file hồ sơ nào.
              </p>
            ) : null}
            {documentsQuery.data?.map((employeeDocument) => (
              <DocumentRow
                key={employeeDocument.id}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => documentDownloadMutation.mutate(employeeDocument)}
                    >
                      <Download size={14} />
                      Tải
                    </Button>
                    <Button
                      disabled={documentDeleteMutation.isPending}
                      size="sm"
                      variant="danger"
                      onClick={() => documentDeleteMutation.mutate(employeeDocument.id)}
                    >
                      <Trash2 size={14} />
                      Xóa
                    </Button>
                  </>
                }
                description={`${formatFileSize(employeeDocument.size)} · ${formatDateTime(employeeDocument.uploadedAt)}`}
                name={employeeDocument.originalName}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DocumentRow({
  actions,
  description,
  name,
}: {
  actions?: ReactNode;
  description: string;
  name: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
          <FileText size={16} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function handleAvatarFileChange(setAvatarFile: (file: File | null) => void) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    setAvatarFile(event.target.files?.[0] ?? null);
  };
}

function handleDocumentFilesChange(setDocumentFiles: (files: File[]) => void) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    setDocumentFiles(Array.from(event.target.files ?? []));
  };
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}
