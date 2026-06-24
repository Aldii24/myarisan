import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardHeader({
  actions,
  badges,
  eyebrow,
  subtitle,
  title,
}: {
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  eyebrow?: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-2 p-4 md:p-6">
        {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <CardTitle className="text-xl font-semibold tracking-tight text-foreground md:text-3xl">
          {title}
        </CardTitle>
        {subtitle ? (
          <CardDescription className="max-w-2xl leading-6">
            {subtitle}
          </CardDescription>
        ) : null}
        {actions ? (
          <CardAction className="flex flex-wrap items-center gap-2">
            {actions}
          </CardAction>
        ) : null}
      </CardHeader>
    </Card>
  );
}
