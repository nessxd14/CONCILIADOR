import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role, sin sesión de usuario. Solo para route handlers
 * que autentican por secreto compartido (ingesta de agentes).
 * NUNCA importar esto desde un componente cliente: expondría la key.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
