import type { ReactNode } from "react";

import { EmptyState } from "./EmptyState";
import { PageHeader } from "./PageHeader";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  actions?: ReactNode;
};

export function ModulePlaceholder({
  title,
  description,
  emptyTitle,
  emptyDescription,
  actions,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader actions={actions} description={description} title={title} />
      <EmptyState description={emptyDescription} title={emptyTitle} />
    </div>
  );
}
