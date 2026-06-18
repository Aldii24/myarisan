import "server-only";

export type ParsedPaymentProof = {
  detectedAmount: number | null;
  detectedDate: string | null;
  detectedSenderName: string | null;
  detectedBankOrWallet: string | null;
  matchedMemberName: string | null;
  matchedPeriod: string | null;
  confidence: number;
  warnings: string[];
  notes: string;
};

export type ParsePaymentProofParams = {
  activePeriodName: string | null;
  arisanAmountPerPeriod: number;
  duplicateWarnings?: string[];
  memberDisplayName: string;
  memberNames: string[];
  note?: string | null;
  ocrText: string;
  submittedAmount: number;
};

const fallbackResult: ParsedPaymentProof = {
  confidence: 0,
  detectedAmount: null,
  detectedBankOrWallet: null,
  detectedDate: null,
  detectedSenderName: null,
  matchedMemberName: null,
  matchedPeriod: null,
  notes: "Belum bisa dibaca otomatis.",
  warnings: [],
};

function getDeepSeekConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY?.trim(),
    baseUrl: process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat",
  };
}

function fallbackWithWarnings(warnings: string[], notes?: string): ParsedPaymentProof {
  return {
    ...fallbackResult,
    notes: notes ?? fallbackResult.notes,
    warnings: Array.from(new Set(warnings.filter(Boolean))),
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/\D/g, ""));

    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }

  return null;
}

function normalizeWarnings(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((warning) => (typeof warning === "string" ? warning.trim() : ""))
    .filter(Boolean);
}

function clampConfidence(value: unknown) {
  const confidence = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(confidence)) {
    return 0;
  }

  return Math.min(Math.max(confidence, 0), 1);
}

function extractJsonObject(content: string) {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI response did not contain a JSON object.");
  }

  return withoutFence.slice(firstBrace, lastBrace + 1);
}

function normalizeParsedResult(
  value: unknown,
  additionalWarnings: string[],
): ParsedPaymentProof {
  if (!value || typeof value !== "object") {
    return fallbackWithWarnings(["AI response tidak valid.", ...additionalWarnings]);
  }

  const record = value as Record<string, unknown>;
  const warnings = Array.from(
    new Set([...normalizeWarnings(record.warnings), ...additionalWarnings]),
  );

  return {
    confidence: clampConfidence(record.confidence),
    detectedAmount: numberOrNull(record.detectedAmount),
    detectedBankOrWallet: stringOrNull(record.detectedBankOrWallet),
    detectedDate: stringOrNull(record.detectedDate),
    detectedSenderName: stringOrNull(record.detectedSenderName),
    matchedMemberName: stringOrNull(record.matchedMemberName),
    matchedPeriod: stringOrNull(record.matchedPeriod),
    notes: stringOrNull(record.notes) ?? "",
    warnings,
  };
}

function buildPrompt(params: ParsePaymentProofParams) {
  return `You are extracting transfer proof information for arisan payment.
Return JSON only. Do not invent data. If unsure, use null.
This output is only for admin review, never automatic confirmation.

Expected amount: ${params.arisanAmountPerPeriod}
Submitted amount: ${params.submittedAmount}
Active period: ${params.activePeriodName ?? "unknown"}
Claimed member: ${params.memberDisplayName}
All member names: ${params.memberNames.join(", ")}
Caption: ${params.note ?? ""}
OCR text:
${params.ocrText || "(empty)"}

Return exactly:
{"detectedAmount":number|null,"detectedDate":string|null,"detectedSenderName":string|null,"detectedBankOrWallet":string|null,"matchedMemberName":string|null,"matchedPeriod":string|null,"confidence":number,"warnings":string[],"notes":string}

Warnings must include when relevant: nominal does not match, sender name does not match, date unclear, OCR text too empty, possible duplicate or unclear proof.`;
}

export async function parsePaymentProofWithAI(
  params: ParsePaymentProofParams,
): Promise<ParsedPaymentProof> {
  const duplicateWarnings = params.duplicateWarnings ?? [];
  const localWarnings = [...duplicateWarnings];

  if (!params.ocrText.trim()) {
    localWarnings.push("OCR text too empty.");
  }

  if (params.submittedAmount !== params.arisanAmountPerPeriod) {
    localWarnings.push("Nominal tidak sesuai.");
  }

  const config = getDeepSeekConfig();

  if (!config.apiKey) {
    return fallbackWithWarnings(
      ["DEEPSEEK_API_KEY belum diatur.", ...localWarnings],
      "Sistem belum bisa membaca otomatis karena kunci AI belum diatur.",
    );
  }

  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      body: JSON.stringify({
        messages: [
          {
            content:
              "You extract payment proof data. Return valid JSON only with the requested keys.",
            role: "system",
          },
          {
            content: buildPrompt(params),
            role: "user",
          },
        ],
        model: config.model,
        response_format: { type: "json_object" },
        temperature: 0,
      }),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallbackWithWarnings(
        [`AI error ${response.status}.`, ...localWarnings],
        "Sistem belum bisa membaca otomatis.",
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return fallbackWithWarnings(
        ["AI response kosong.", ...localWarnings],
        "Sistem belum bisa membaca otomatis.",
      );
    }

    const parsed = JSON.parse(extractJsonObject(content));

    return normalizeParsedResult(parsed, localWarnings);
  } catch (error) {
    console.warn("DeepSeek payment proof parsing failed", error);
    return fallbackWithWarnings(
      ["AI gagal membaca bukti.", ...localWarnings],
      "Sistem belum bisa membaca otomatis.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
