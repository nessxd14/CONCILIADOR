/** El mismo esquema para navegador, servidor y servicio. */
export function hermesSchema(): "public" | "hermes" {
  const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA ?? "public";
  if (schema !== "public" && schema !== "hermes") {
    throw new Error("NEXT_PUBLIC_SUPABASE_SCHEMA debe ser public o hermes");
  }
  return schema;
}

export function databaseOptions() {
  return { db: { schema: hermesSchema() } };
}
