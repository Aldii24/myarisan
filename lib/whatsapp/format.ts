// One consistent visual language for WhatsApp bot replies.
//
// WhatsApp only supports *bold*, _italic_, ~strike~, ```mono``` and emojis — no
// colours, tables, or real dividers. These helpers fake a "card" look with a
// ruled header, emoji-labelled fields, and a quiet italic footer so every reply
// reads neat and friendly instead of a flat wall of text.

const RULE = "━━━━━━━━━━━━━";

export function bold(text: string | number) {
  return `*${text}*`;
}

export function italic(text: string | number) {
  return `_${text}_`;
}

// A ruled, titled header. `title` is shouted (uppercased) for scannability and
// the optional subtitle (usually the arisan name) sits under it in italics.
//
//   ━━━━━━━━━━━━━
//   🧾 *STATUS ARISAN*
//   _Arisan RT 03_
//   ━━━━━━━━━━━━━
export function header(emoji: string, title: string, subtitle?: string) {
  const lines = [RULE, `${emoji} ${bold(title.toUpperCase())}`];

  if (subtitle) {
    lines.push(italic(subtitle));
  }

  lines.push(RULE);

  return lines.join("\n");
}

// An emoji-labelled key/value line: "📅 Periode: *Juni 2026*".
export function field(emoji: string, label: string, value: string | number) {
  return `${emoji} ${label}: ${bold(String(value))}`;
}

export function bullets(items: string[], marker = "•") {
  return items.map((item) => `${marker} ${item}`).join("\n");
}

export function numbered(items: string[]) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

// A quiet footer hint, e.g. footer("Ketik MENU untuk perintah lain.").
export function footer(text: string) {
  return italic(text);
}

// Joins the building blocks of a message with a blank line between each,
// dropping any empty parts.
export function compose(...parts: Array<string | null | undefined | false>) {
  return parts.filter(Boolean).join("\n\n");
}
