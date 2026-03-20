import { ProtocolError } from "./errors";

const encoder = new TextEncoder();

export function canonicalJsonArray(value: unknown[]): Uint8Array {
  if (!Array.isArray(value)) {
    throw new ProtocolError("canonicalJsonArray expects an array");
  }

  return encoder.encode(serializeCanonicalJson(value));
}

export function utf8(value: string): Uint8Array {
  return encoder.encode(value);
}

function serializeCanonicalJson(value: unknown): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new ProtocolError("canonical JSON does not support non-finite numbers");
      }

      return JSON.stringify(value);
    case "string":
      return JSON.stringify(value);
    case "object":
      if (Array.isArray(value)) {
        return serializeCanonicalArray(value);
      }

      return serializeCanonicalObject(value);
    default:
      throw new ProtocolError(`canonical JSON does not support ${typeof value}`);
  }
}

function serializeCanonicalArray(value: unknown[]): string {
  const parts: string[] = [];

  for (let index = 0; index < value.length; index += 1) {
    if (!(index in value)) {
      throw new ProtocolError("canonical JSON does not support sparse arrays");
    }

    parts.push(serializeCanonicalJson(value[index]));
  }

  return `[${parts.join(",")}]`;
}

function serializeCanonicalObject(value: object): string {
  const entries = Object.entries(value as Record<string, unknown>).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );

  const parts = entries.map(([key, entryValue]) => {
    if (entryValue === undefined) {
      throw new ProtocolError("canonical JSON does not support undefined");
    }

    return `${JSON.stringify(key)}:${serializeCanonicalJson(entryValue)}`;
  });

  return `{${parts.join(",")}}`;
}
