import { describe, expect, it } from "vitest";

describe("sinProduccion", () => {
  it("rechaza fetch hacia Supabase real", async () => {
    await expect(fetch("https://x.supabase.co/rest/v1/")).rejects.toThrow(
      "Test intentó llamar a Supabase real: https://x.supabase.co/rest/v1/",
    );
  });

  it("rechaza URL y Request", async () => {
    await expect(fetch(new URL("https://x.supabase.in/rest/v1/"))).rejects.toThrow("Supabase real");
    await expect(fetch(new Request("https://x.supabase.co/rest/v1/"))).rejects.toThrow("Supabase real");
  });

  it("usa URL falsa y ninguna service key en el entorno de pruebas", () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe("");
  });
});
