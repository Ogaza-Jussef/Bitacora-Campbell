export type FieldError = {
  field: string;
  reason: string;
};

export class AppError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly details: FieldError[] = [],
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}
