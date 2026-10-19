import { db } from "@/server/db";

export type FieldSpec = {
  type: "SIGNATURE" | "FULL_NAME" | "CPF" | "DATE" | "TEXT" | "CHECKBOX" | "INITIALS";
  label: string;
  required: boolean;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Campos de preenchimento padrão de um signatário.
 * As posições (x/y/width/height) são em pontos (1/72") e servem para
 * posicionar os campos sobre o PDF renderizado.
 */
export function defaultFieldsForSigner(role: string): FieldSpec[] {
  return [
    { type: "FULL_NAME", label: "Nome completo", required: true, page: 1, x: 80, y: 620, width: 260, height: 20 },
    { type: "CPF", label: "CPF", required: false, page: 1, x: 80, y: 650, width: 180, height: 20 },
    { type: "DATE", label: "Data da assinatura", required: true, page: 1, x: 280, y: 650, width: 140, height: 20 },
    { type: "SIGNATURE", label: `Assinatura — ${role}`, required: true, page: 1, x: 80, y: 690, width: 240, height: 60 },
  ];
}

/**
 * Cria os campos de preenchimento de um signatário na versão do contrato.
 */
export async function createSignerFields(
  versionId: string,
  signerId: string,
  role: string
): Promise<void> {
  const specs = defaultFieldsForSigner(role);
  await db.signatureField.createMany({
    data: specs.map((s) => ({
      versionId,
      signerId,
      type: s.type,
      label: s.label,
      required: s.required,
      page: s.page,
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
    })),
  });
}
