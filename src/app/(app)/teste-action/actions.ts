"use server";

export async function acaoTesteSemDB(): Promise<{ ok: boolean; data: string }> {
  return { ok: true, data: "sem db, funcionou" };
}
