/**
 * Sanitizes error messages before displaying to users.
 * Prevents leaking database schema, constraint names, or internal details.
 */
export function sanitizeError(error: unknown): string {
  if (!error) return "Something went wrong. Please try again.";

  const message = (error as any)?.message ?? String(error);

  // Auth-specific friendly messages
  if (message.includes("Invalid login credentials")) return "Invalid email or password.";
  if (message.includes("Email not confirmed")) return "Please verify your email before signing in.";
  if (message.includes("User already registered")) return "An account with this email already exists.";
  if (message.includes("Password should be")) return "Password is too weak. Use at least 6 characters.";
  if (message.includes("Email rate limit exceeded")) return "Too many attempts. Please wait a moment.";

  // Generic database / RLS errors — never expose internals
  if (message.includes("violates row-level security")) return "You don't have permission to do that.";
  if (message.includes("violates foreign key")) return "Something went wrong. Please try again.";
  if (message.includes("violates unique constraint")) return "This already exists.";
  if (message.includes("violates check constraint")) return "Invalid data provided.";

  // If it looks like a Postgres/internal error, hide it
  if (message.includes("relation ") || message.includes("column ") || message.includes("schema ")) {
    console.error("[Sanitized Error]", message);
    return "Something went wrong. Please try again.";
  }

  // For short, user-friendly messages, pass through
  if (message.length < 100 && !message.includes("pg_") && !message.includes("supabase")) {
    return message;
  }

  console.error("[Sanitized Error]", message);
  return "Something went wrong. Please try again.";
}
