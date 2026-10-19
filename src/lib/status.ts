export const CONTRACT_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: "Rascunho", tone: "bg-paper text-ink-soft" },
  SENT: { label: "Enviado", tone: "bg-cobalt-tint text-cobalt" },
  VIEWED: { label: "Visualizado", tone: "bg-cobalt-tint text-cobalt" },
  AWAITING: { label: "Aguardando", tone: "bg-warn-tint text-warn" },
  PARTIALLY_SIGNED: { label: "Parcialmente assinado", tone: "bg-warn-tint text-warn" },
  SIGNED: { label: "Assinado", tone: "bg-ok-tint text-ok" },
  REFUSED: { label: "Recusado", tone: "bg-bad-tint text-bad" },
  CANCELED: { label: "Cancelado", tone: "bg-paper text-ink-mute" },
  EXPIRED: { label: "Vencido", tone: "bg-bad-tint text-bad" },
};

export const SIGNER_STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "Pendente", tone: "bg-paper text-ink-soft" },
  VIEWED: { label: "Visualizado", tone: "bg-cobalt-tint text-cobalt" },
  SIGNED: { label: "Assinado", tone: "bg-ok-tint text-ok" },
  REFUSED: { label: "Recusado", tone: "bg-bad-tint text-bad" },
};

export const DOCUMENT_KIND: Record<string, string> = {
  VERSION_PDF: "PDF da versão",
  SIGNED_PDF: "PDF assinado",
  CERTIFICATE: "Certificado",
  ATTACHMENT: "Anexo",
  IMPORTED: "Importado",
};

export const FIELD_TYPE: Record<string, string> = {
  SIGNATURE: "Assinatura",
  FULL_NAME: "Nome completo",
  CPF: "CPF",
  DATE: "Data",
  TEXT: "Texto",
  CHECKBOX: "Caixa de seleção",
  INITIALS: "Iniciais",
};

export const ROLE: Record<string, string> = {
  ADMIN: "Administrador",
  EMPLOYEE: "Colaborador",
  SALES: "Comercial",
  FINANCE: "Financeiro",
  VIEWER: "Visualizador",
};
