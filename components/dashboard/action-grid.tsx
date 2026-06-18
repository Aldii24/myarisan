import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardAction = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export function ActionGrid({ actions }: { actions: DashboardAction[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Link
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-auto min-h-20 flex-col gap-2 whitespace-normal bg-white p-3 text-center shadow-sm",
            )}
            href={action.href}
            key={`${action.href}-${action.label}`}
          >
            <Icon className="size-5 text-emerald-700" />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
