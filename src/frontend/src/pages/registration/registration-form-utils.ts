import type { Registration } from "@/types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GHANA_CARD_PATTERN = /^GHA-\d{9}-\d$/i;
const GHANA_PHONE_PATTERN = /^(?:\+233|0)\d{9}$/;

function randomCodeBody(length = 6) {
  let value = "";
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoApi.getRandomValues(bytes);
    for (const byte of bytes) {
      value += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
    return value;
  }

  for (let index = 0; index < length; index += 1) {
    value += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return value;
}

export function generatePreviewVerificationCode(
  existingRegistrations: Registration[],
): string {
  const existingCodes = new Set(
    existingRegistrations.map((item) => item.verificationCode.toUpperCase()),
  );

  let candidate = "";
  do {
    candidate = `AGM-${randomCodeBody(6)}`;
  } while (existingCodes.has(candidate));

  return candidate;
}

export function validateGhanaCardId(value: string): boolean {
  return GHANA_CARD_PATTERN.test(value.trim());
}

export function validateGhanaPhone(value: string): boolean {
  return GHANA_PHONE_PATTERN.test(value.trim().replace(/\s+/g, ""));
}

export function normalizePhone(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

export function buildRegistrationNotes(
  lines: Array<[label: string, value: string]>,
): string {
  return lines.map(([label, value]) => `${label}: ${value}`).join("\n");
}

export function parseRegistrationNotes(notes?: string): Record<string, string> {
  if (!notes) return {};
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) return accumulator;
      const label = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (label) {
        accumulator[label] = value;
      }
      return accumulator;
    }, {});
}

export function getDefaultAgmYear(agmDate?: string): string {
  if (agmDate) {
    const detected = new Date(agmDate).getFullYear();
    if (!Number.isNaN(detected)) {
      return detected.toString();
    }
  }
  return new Date().getFullYear().toString();
}
