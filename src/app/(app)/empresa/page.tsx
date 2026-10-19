import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Alert, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import { EmpresaForm } from "./empresa-form";

export const metadata: Metadata = { title: "Minha empresa" };
export const dynamic = "force-dynamic";

const SENT = ["SENT", "VIEWED", "AWAITING", "PARTIALLY_SIGNED", "SIGNED", "REFUSED", "EXPIRED"] as const;
const WAITING = ["SENT", "VIEWED", "AWAITING", "PARTIALLY_SIGNED"] as const;

export default async function EmpresaPage() {
  const session = await requireUser();
  const companyId = session.companyId;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const base = { companyId, deletedAt: null };

  const [
    company,
    usersCount,
    clientsCount,
    contractsCount,
    vaultsCount,
    total,
    sent,
    waiting,
    signed,
    expired,
    canceled,
    draft,
    signedMonth,
  ] = await Promise.all([
    db.company.findUnique({ where: { id: companyId } }),
    db.user.count({ where: { companyId, deletedAt: null } }),
    db.client.count({ where: base }),
    db.contract.count({ where: base }),
    db.vault.count({ where: { companyId } }),
    db.contract.count({ where: base }),
    db.contract.count({ where: { ...base, status: { in: [...SENT] } } }),
    db.contract.count({ where: { ...base, status: { in: [...WAITING] } } }),
    db.contract.count({ where: { ...base, status: "SIGNED" } }),
    db.contract.count({ where: { ...base, status: "EXPIRED" } }),
    db.contract.count({ where: { ...base, status: "CANCELED" } }),
    db.contract.count({ where: { ...base, status: "DRAFT" } }),
    db.contract.count({ where: { ...base, status: "SIGNED", completedAt: { gte: monthStart } } }),
  ]);

  if (!company) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Minha empresa" description="Dados cadastrais da sua empresa." />
        <Alert tone="error">Não foi possível carregar os dados da empresa.</Alert>
      </div>
    );
  }

  const today = [
    { label: "Usuários na empresa", value: usersCount },
    { label: "Clientes", value: clientsCount },
    { label: "Contratos", value: contractsCount },
    { label: "Cofres", value: vaultsCount },
  ];

  const contractCards = [
    { label: "Total de contratos", value: total },
    { label: "Enviados", value: sent },
    { label: "Aguardando assinatura", value: waiting },
    { label: "Assinados", value: signed },
    { label: "Vencidos", value: expired },
    { label: "Cancelados", value: canceled },
    { label: "Rascunhos", value: draft },
    { label: "Assinados neste mês", value: signedMonth },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Minha empresa"
        description="Dados cadastrais, cores e preferências aplicadas aos documentos da sua empresa."
        action={
          <Link
            href="/empresa/equipe"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-paper-line bg-white px-5 text-[15px] font-semibold text-ink-soft transition-colors hover:bg-paper"
          >
            <Users className="h-4 w-4" aria-hidden />
            Equipe
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />

      <Card className="mb-6">
        <CardHeader title="Dados da empresa" />
        <div className="px-5 py-5">
          <EmpresaForm
            company={{
              name: company.name,
              legalName: company.legalName,
              cnpj: company.cnpj,
              email: company.email,
              phone: company.phone,
              address: company.address,
              website: company.website,
              primaryColor: company.primaryColor,
              secondaryColor: company.secondaryColor,
              contractPrefix: company.contractPrefix,
              responsibleName: company.responsibleName,
            }}
          />
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Números de hoje" />
        <div className="px-5 py-5">
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {today.map((item) => (
              <Stat key={item.label} label={item.label} value={item.value} />
            ))}
          </dl>
        </div>
      </Card>

      <Card>
        <CardHeader title="Resumo dos contratos" />
        <div className="px-5 py-5">
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {contractCards.map((c) => (
              <div key={c.label} className="rounded-xl border border-paper-line bg-white p-4">
                <dt className="text-sm text-ink-mute">{c.label}</dt>
                <dd className="mt-1 text-3xl font-extrabold tabular-nums">{c.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-ink-mute">
            Os números acima refletem a situação atual dos contratos da sua empresa.
          </p>
        </div>
      </Card>
    </div>
  );
}
