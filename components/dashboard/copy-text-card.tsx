"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function CopyTextCard({
  description,
  text,
  title,
}: {
  description?: string;
  text: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Card className="bg-card shadow-sm">
      <CardHeader className="p-4 md:p-6">
        <CardTitle>{title}</CardTitle>
        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 md:px-6 md:pb-6">
        <Textarea
          className="min-h-32 resize-none bg-muted/50 text-sm leading-6"
          readOnly
          value={text}
        />
        <Button className="w-full" onClick={copyText} type="button" variant="outline">
          {copied ? <Check /> : <Copy />}
          {copied ? "Tersalin" : "Salin ke Grup"}
        </Button>
      </CardContent>
    </Card>
  );
}
