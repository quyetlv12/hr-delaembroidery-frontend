import { FileUp, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { cn } from "@/lib/utils";

import { FormFieldShell } from "./FormFieldShell";

type AppFileUploadProps<T extends FieldValues> = {
  label: string;
  name: Path<T>;
  control: Control<T>;
  accept?: string;
  maxSizeMB?: number;
  description?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AppFileUpload<T extends FieldValues>({
  label,
  name,
  control,
  accept,
  maxSizeMB = 10,
  description,
}: AppFileUploadProps<T>) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const file = field.value as File | null | undefined;

        const handleFile = (f: File | null) => {
          field.onChange(f);
        };

        const handleDrop = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          const droppedFile = e.dataTransfer.files?.[0] ?? null;
          if (droppedFile) handleFile(droppedFile);
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          handleFile(e.target.files?.[0] ?? null);
        };

        const handleRemove = () => {
          handleFile(null);
          if (inputRef.current) inputRef.current.value = "";
        };

        return (
          <FormFieldShell label={label} error={fieldState.error?.message}>
            {/* File selected state */}
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileUp className="text-primary" size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  aria-label="Xóa file"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  type="button"
                  onClick={handleRemove}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              /* Drop zone */
              <label
                className={cn(
                  "group relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-all duration-200",
                  isDragOver
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-muted/50",
                )}
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                    isDragOver
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                  )}
                >
                  <FileUp size={22} />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {isDragOver ? (
                      "Thả file tại đây"
                    ) : (
                      <>
                        <span className="text-primary">Nhấn để chọn file</span>
                        {" hoặc kéo thả vào đây"}
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {description ?? `Tối đa ${maxSizeMB}MB${accept ? ` • ${accept}` : ""}`}
                  </p>
                </div>
                <input
                  ref={inputRef}
                  accept={accept}
                  className="sr-only"
                  type="file"
                  onChange={handleChange}
                />
              </label>
            )}
          </FormFieldShell>
        );
      }}
    />
  );
}
