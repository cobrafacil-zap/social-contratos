/**
 * Limpeza do banco para o início de uso oficial.
 *
 * APAGA (dados de teste):
 *   - Signature, SignatureField, Signer, ContractVersion, Contract
 *   - Client
 *   - AuditEvent, Notification, EmailLog ligados a esses contratos
 *   - ActivityLog cujo registro aponte para um contrato ou cliente removido
 *
 * MANTÉM (configuração):
 *   - Company, User (admin), ContractTemplate, Vault, Document avulso
 *
 * Uso:
 *   npx tsx scripts/limpar-contratos.ts          # apenas mostra o que seria apagado
 *   npx tsx scripts/limpar-contratos.ts --aplicar # apaga de verdade
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");

/** Reinstala o gatilho que torna a auditoria append-only (mesmo SQL de prisma/sql/guards.sql). */
async function reativarProtecao() {
  await db.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION audit_event_immutable() RETURNS trigger AS $fn$
    BEGIN
      RAISE EXCEPTION 'AuditEvent é append-only: % não permitido', TG_OP;
    END;
    $fn$ LANGUAGE plpgsql
  `);
  await db.$executeRawUnsafe(`
    DO $do$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'audit_event_no_update_delete'
      ) THEN
        CREATE TRIGGER audit_event_no_update_delete
          BEFORE UPDATE OR DELETE ON "AuditEvent"
          FOR EACH ROW EXECUTE FUNCTION audit_event_immutable();
      END IF;
    END
    $do$
  `);
  console.log("Proteção de auditoria (append-only) reinstalada.");
}

async function main() {
  const antes = {
    contratos: await db.contract.count(),
    clientes: await db.client.count(),
    versoes: await db.contractVersion.count(),
    signatarios: await db.signer.count(),
    campos: await db.signatureField.count(),
    assinaturas: await db.signature.count(),
    auditoria: await db.auditEvent.count(),
    notificacoes: await db.notification.count(),
    modelos: await db.contractTemplate.count(),
    cofres: await db.vault.count(),
    usuarios: await db.user.count(),
    documentos: await db.document.count(),
  };

  console.log("\n=== ANTES ===");
  console.table(antes);

  if (!aplicar) {
    console.log("\nEste foi um teste a seco. Nada foi apagado.");
    console.log("Para aplicar, rode:  npx tsx scripts/limpar-contratos.ts --aplicar\n");
    return;
  }

  // 1) Coletar os ids que serão removidos (para limpar os logs que apontam para eles).
  const contratos = await db.contract.findMany({ select: { id: true } });
  const clientes = await db.client.findMany({ select: { id: true } });
  const ids = [...contratos.map((c) => c.id), ...clientes.map((c) => c.id)];

  await db.$transaction(
    async (tx) => {
    // A auditoria é append-only por um gatilho. Ele é removido só para esta
    // limpeza e reinstalado logo ao final (ver `reativarProtecao`).
    await tx.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS audit_event_no_update_delete ON "AuditEvent"`
    );

    // 2) Filhos diretos dos contratos.
    await tx.signature.deleteMany({});
    await tx.signatureField.deleteMany({});
    await tx.signer.deleteMany({});
    await tx.contractVersion.deleteMany({});
    await tx.document.deleteMany({ where: { contractId: { not: null } } });
    await tx.emailLog.deleteMany({
      where: { OR: [{ contractId: { not: null } }, { signerId: { not: null } }] },
    });

    // 3) Auditoria e notificações ligadas a contrato.
    await tx.notification.deleteMany({});
    await tx.auditEvent.deleteMany({});

    // 4) Atividades que apontam para um contrato ou cliente que vai deixar de existir.
    await tx.activityLog.deleteMany({ where: { entityId: { in: ids } } });
    await tx.activityLog.deleteMany({ where: { entity: { in: ["Contract", "Client"] } } });

    // 5) Contratos e clientes.
    await tx.contract.deleteMany({});
    await tx.client.deleteMany({});

    // 6) Volta a numeração para começar do 0001 no uso oficial.
    await tx.contractSequence.updateMany({ data: { last: 0 } });
    },
    { timeout: 120_000, maxWait: 20_000 }
  );

  // Reativa a proteção de auditoria append-only.
  await reativarProtecao();

  const depois = {
    contratos: await db.contract.count(),
    clientes: await db.client.count(),
    versoes: await db.contractVersion.count(),
    signatarios: await db.signer.count(),
    campos: await db.signatureField.count(),
    assinaturas: await db.signature.count(),
    auditoria: await db.auditEvent.count(),
    notificacoes: await db.notification.count(),
    modelos: await db.contractTemplate.count(),
    cofres: await db.vault.count(),
    usuarios: await db.user.count(),
    documentos: await db.document.count(),
  };

  console.log("\n=== DEPOIS ===");
  console.table(depois);
  console.log("\nLimpeza concluída. Modelos, cofres, usuários e empresa foram mantidos.\n");
}

main()
  .catch((e) => {
    console.error("Falha na limpeza:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
