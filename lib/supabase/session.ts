import type { SupabaseClient } from "@supabase/supabase-js";
import { rolDesdeBase } from "@/lib/roles";

/** Nunca autorizar con user_metadata ni volver a un claim si la consulta falla. */
export async function obtenerSesionHermes(supabase: SupabaseClient<any, "public" | "hermes">) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { data: { user: null, rol: null }, error };

  const result = await supabase.rpc("rol_actual");
  return {
    data: { user, rol: result.error ? null : rolDesdeBase(result.data) },
    error: result.error,
  };
}
