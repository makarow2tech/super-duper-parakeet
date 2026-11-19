// Küçük HTTP yardımcıları: hata tipi ve gövde doğrulama.

export class HttpError extends Error {
  constructor(status, message, code = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = true;
  }
}

// zod şemasıyla gövde doğrula; hatalıysa 400 + okunabilir mesaj.
export function parseBody(schema, body) {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
      .join(", ");
    throw new HttpError(400, message || "Geçersiz gövde");
  }
  return result.data;
}
