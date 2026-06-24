import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  action,
  description,
  icon: Icon,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <Card className="border-dashed border-border bg-card shadow-none">
      <CardContent className="flex flex-col items-center px-5 py-8 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-success-surface text-success-foreground">
          <Icon className="size-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {action ? <div className="mt-4">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
