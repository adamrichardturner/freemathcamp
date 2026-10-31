import { Data } from "effect";

/** Typed failures. The HTTP layer maps each tag to a status code in one place. */
export class ValidationError extends Data.TaggedError("ValidationError")<{ message: string; issues?: unknown }> {}
export class Unauthorized extends Data.TaggedError("Unauthorized")<{ message: string }> {}
export class NotFound extends Data.TaggedError("NotFound")<{ resource: string; id?: string }> {}
export class Conflict extends Data.TaggedError("Conflict")<{ message: string }> {}
export class DatabaseError extends Data.TaggedError("DatabaseError")<{ cause: unknown }> {}

export type AppError = ValidationError | Unauthorized | NotFound | Conflict | DatabaseError;
