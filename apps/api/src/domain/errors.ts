import { Data } from "effect";

/** Typed failures. The HTTP layer maps each tag to a status code in one place. */
export class ValidationError extends Data.TaggedError("ValidationError")<{ message: string; issues?: unknown }> {}
export class Unauthorized extends Data.TaggedError("Unauthorized")<{ message: string }> {}
export class NotFound extends Data.TaggedError("NotFound")<{ resource: string; id?: string }> {}
export class Conflict extends Data.TaggedError("Conflict")<{ message: string }> {}
export class RateLimited extends Data.TaggedError("RateLimited")<{ message: string }> {}
export class EmailNotVerified extends Data.TaggedError("EmailNotVerified")<{ message: string }> {}
export class LessonLocked extends Data.TaggedError("LessonLocked")<{ message: string }> {}
export class EmailDeliveryError extends Data.TaggedError("EmailDeliveryError")<{ cause: unknown }> {}
export class DatabaseError extends Data.TaggedError("DatabaseError")<{ cause: unknown }> {}

export type AppError = ValidationError | Unauthorized | NotFound | Conflict | RateLimited | EmailNotVerified | LessonLocked | EmailDeliveryError | DatabaseError;
