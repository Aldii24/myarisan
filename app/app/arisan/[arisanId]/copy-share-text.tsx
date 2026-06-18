"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CopyShareText({ text }: { text: string }) {
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
    <div className="space-y-3">
      <Textarea
        className="min-h-32 resize-none bg-muted/45 text-sm leading-6"
        readOnly
        value={text}
      />
      <Button
        className="w-full"
        onClick={copyText}
        type="button"
        variant="outline"
      >
        {copied ? <Check /> : <Copy />}
        {copied ? "Tersalin" : "Salin ke Grup"}
      </Button>
    </div>
  );
}
