-- Proteções de banco: aplicar DEPOIS da migration inicial (npm run db:guards)
-- ============================================================
-- Auditoria append-only: impede UPDATE/DELETE em AuditEvent
-- ============================================================
CREATE OR REPLACE FUNCTION audit_event_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent é append-only: % não permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_no_update_delete
  BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION audit_event_immutable();

-- Bloqueia alteração do conteúdo de versões já travadas (enviadas para assinatura)
CREATE OR REPLACE FUNCTION contract_version_locked() RETURNS trigger AS $$
BEGIN
  IF OLD."isLocked" AND (NEW."content" IS DISTINCT FROM OLD."content"
     OR NEW."renderedHtml" IS DISTINCT FROM OLD."renderedHtml"
     OR NEW."sha256" IS DISTINCT FROM OLD."sha256") THEN
    RAISE EXCEPTION 'Versão travada não pode ter o conteúdo alterado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contract_version_lock_guard
  BEFORE UPDATE ON "ContractVersion"
  FOR EACH ROW EXECUTE FUNCTION contract_version_locked();

-- RLS: o app acessa só pelo servidor (Prisma/service role). Bloqueia acesso direto via API pública do Supabase.
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\_prisma%' LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
