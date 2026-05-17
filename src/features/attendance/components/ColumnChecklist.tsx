export function ColumnChecklist<TColumn extends string>({
  title,
  columns,
  labels,
  selectedColumns,
  onToggle,
}: {
  title: string;
  columns: readonly TColumn[];
  labels: Record<TColumn, string>;
  selectedColumns: TColumn[];
  onToggle: (column: TColumn) => void;
}) {
  const selectedSet = new Set(selectedColumns);

  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs font-medium text-muted-foreground">
          {selectedColumns.length}/{columns.length} cột
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {columns.map((column) => (
          <label
            className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
            key={column}
          >
            <input
              checked={selectedSet.has(column)}
              className="h-4 w-4 accent-primary"
              type="checkbox"
              onChange={() => onToggle(column)}
            />
            <span>{labels[column]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
