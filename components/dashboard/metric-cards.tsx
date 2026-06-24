import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DashboardMetric = {
  icon?: LucideIcon;
  label: string;
  tone?: "amber" | "emerald" | "indigo" | "red" | "slate";
  value: React.ReactNode;
};

const toneClasses = {
  amber: "bg-warning-surface text-warning-foreground",
  emerald: "bg-success-surface text-success-foreground",
  indigo: "bg-info-surface text-info-foreground",
  red: "bg-danger-surface text-danger-foreground",
  slate: "bg-muted text-muted-foreground",
};

export function MetricCards({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const tone = metric.tone ?? "emerald";

        return (
          <Card
            className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm ring-0"
            key={metric.label}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-xs font-medium leading-5 text-muted-foreground">
                {metric.label}
              </p>
              {Icon ? (
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    toneClasses[tone],
                  )}
                >
                  <Icon className="size-4" />
                </span>
              ) : null}
            </div>
            <p className="mt-2 break-words text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              {metric.value}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
