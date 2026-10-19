import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

/** Modelo de contrato padrão criado automaticamente para a empresa. */
export type DefaultTemplate = {
  name: string;
  category: string;
  html: string;
  headerHtml?: string;
  footerHtml?: string;
};

/** Limite de caracteres aceitos em cada campo HTML do modelo. */
export const MAX_HTML_LENGTH = 200_000;

/** Extrai o HTML de um campo `content` (Json) do modelo de contrato. */
export function templateHtml(content: unknown): string {
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const html = (content as Record<string, unknown>).html;
    if (typeof html === "string") return html;
  }
  return "";
}

/** Normaliza campos opcionais: string vazia vira null. */
export function optionalText(value: string | undefined | null): string | null {
  return value && value.trim().length > 0 ? value : null;
}

/** Mescla o novo HTML no campo `content`, preservando as demais chaves existentes. */
export function mergeTemplateContent(content: unknown, html: string): Prisma.InputJsonValue {
  const base =
    content && typeof content === "object" && !Array.isArray(content)
      ? { ...(content as Record<string, Prisma.JsonValue>) }
      : {};
  return { ...base, html } as unknown as Prisma.InputJsonValue;
}

/** Validação dos campos do modelo de contrato (usada no servidor). */
export const templateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(120, "O nome deve ter no máximo 120 caracteres."),
  category: z
    .string()
    .trim()
    .max(60, "A categoria deve ter no máximo 60 caracteres.")
    .optional(),
  contentHtml: z
    .string()
    .trim()
    .min(20, "O conteúdo do modelo deve ter pelo menos 20 caracteres.")
    .max(MAX_HTML_LENGTH, "O conteúdo do modelo é muito longo."),
  headerHtml: z.string().trim().max(MAX_HTML_LENGTH, "O cabeçalho é muito longo.").optional(),
  footerHtml: z.string().trim().max(MAX_HTML_LENGTH, "O rodapé é muito longo.").optional(),
});

/** Lê e valida os campos do modelo enviados pelo formulário. */
export function readTemplateForm(formData: FormData) {
  return templateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    contentHtml: String(formData.get("contentHtml") ?? ""),
    headerHtml: String(formData.get("headerHtml") ?? ""),
    footerHtml: String(formData.get("footerHtml") ?? ""),
  });
}

const HEADER_PADRAO = `<p style="text-align:center;font-size:12px;color:#6B7385;margin:0 0 12px"><strong>{{empresa_nome}}</strong> &middot; documento protegido</p>`;

const FOOTER_PADRAO = `<p style="text-align:center;font-size:12px;color:#6B7385;margin:12px 0 0">{{empresa_nome}} &middot; página 1 de 1</p>`;

const PRESTACAO_SERVICOS = `<h1>Contrato de Prestação de Serviços</h1>
<p>De um lado <strong>{{empresa_nome}}</strong>, doravante denominada <strong>CONTRATANTE</strong>, e de outro <strong>{{cliente_nome}}</strong>, portador do documento <strong>{{cliente_documento}}</strong>, com endereço em <strong>{{cliente_endereco}}</strong>, doravante denominada <strong>CONTRATADA</strong>, resolvem celebrar o presente Contrato de Prestação de Serviços, mediante as cláusulas e condições a seguir:</p>
<h2>1. Objeto</h2>
<p>Constitui o objeto deste contrato a prestação, pela CONTRATADA, dos serviços de <strong>{{objeto}}</strong> à CONTRATANTE, de acordo com o escopo, o cronograma e as especificações aqui pactuadas.</p>
<h2>2. Vigência</h2>
<p>O presente contrato vigorará de <strong>{{data_inicio}}</strong> até <strong>{{data_fim}}</strong>, podendo ser prorrogado mediante termo aditivo assinado pelas partes, com antecedência mínima de 15 (quinze) dias.</p>
<h2>3. Remuneração e forma de pagamento</h2>
<p>Pelos serviços efetivamente prestados, a CONTRATANTE pagará à CONTRATADA o valor total de <strong>{{valor}}</strong>, mediante depósito na conta bancária indicada em fatura ou transferência instantânea, no prazo de 5 (cinco) dias corridos após a apresentação da nota fiscal.</p>
<h2>4. Obrigações da CONTRATADA</h2>
<ul>
<li>Executar os serviços com zelo, observadas as melhores práticas e a legislação aplicável.</li>
<li>Manter equipe qualificada e arcar com os encargos trabalhistas, fiscais e previdenciários de seu pessoal.</li>
<li>Entregar relatório mensal de acompanhamento das atividades realizadas.</li>
<li>Guardar sigilo sobre as informações recebidas da CONTRATANTE.</li>
</ul>
<h2>5. Obrigações da CONTRATANTE</h2>
<ul>
<li>Realizar o pagamento da remuneração nas datas convencionadas.</li>
<li>Disponibilizar as informações, o acesso aos ambientes e os recursos necessários à execução dos serviços.</li>
<li>Indicar representante responsável pelo acompanhamento e pela aprovação dos serviços prestados.</li>
</ul>
<h2>6. Confidencialidade</h2>
<p>As partes obrigam-se a manter em sigilo todas as informações confidenciais recebidas em razão deste contrato, pelo prazo de 2 (dois) anos contados do término da vigência, independentemente da causa de rescisão.</p>
<h2>7. Rescisão e penalidades</h2>
<p>Qualquer das partes poderá rescindir o contrato, sem ônus, mediante aviso prévio de 30 (trinta) dias corridos. Em caso de descumprimento das obrigações assumidas, a parte infratora indenizará a parte prejudicada em 20% (vinte por cento) do valor total do contrato, sem prejuízo de perdas e danos.</p>
<h2>8. Foro</h2>
<p>Fica eleito o foro da comarca de <strong>{{empresa_endereco}}</strong> para dirimir quaisquer controvérsias oriundas do presente instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
<p>E por estarem justos e contratados, firmam o presente contrato em duas vias de igual teor, na presença de duas testemunhas.</p>
<p>Local e data: {{data_inicio}}.</p>`;

const CONTRATO_TRABALHO = `<h1>Contrato de Trabalho</h1>
<p>De um lado <strong>{{empresa_nome}}</strong>, doravante denominada <strong>EMPREGADOR</strong>, e de outro <strong>{{cliente_nome}}</strong>, portador do documento <strong>{{cliente_documento}}</strong>, residente em <strong>{{cliente_endereco}}</strong>, doravante denominado <strong>EMPREGADO</strong>, celebram o presente Contrato de Trabalho, que se regerá pelas cláusulas e condições a seguir:</p>
<h2>1. Função e objeto</h2>
<p>O EMPREGADO será contratado para exercer o cargo de <strong>{{objeto}}</strong>, com as atribuições e responsabilidades inerentes à função, orientadas pelas políticas internas do EMPREGADOR.</p>
<h2>2. Vigência</h2>
<p>O contrato vigorará de <strong>{{data_inicio}}</strong> até <strong>{{data_fim}}</strong>, período durante o qual o período de experiência será de 45 (quarenta e cinco) dias, conforme a legislação vigente.</p>
<h2>3. Remuneração e benefícios</h2>
<p>O EMPREGADO receberá, como contrapénsio pelo exercício da função, a remuneração mensal de <strong>{{valor}}</strong>, paga até o 5º (quinto) dia útil do mês subsequente ao da prestação dos serviços, além dos benefícios previstos na legislação e nas políticas da empresa.</p>
<h2>4. Jornada de trabalho</h2>
<p>A jornada de trabalho será de 44 (quarenta e quatro) horas semanais, distribuídas de segunda a sexta-feira, das 9h às 18h, com 1 (uma) hora de intervalo para refeição e intervalo mínimo de 11 (onze) horas entre jornadas.</p>
<h2>5. Obrigações do EMPREGADO</h2>
<ul>
<li>Cumprir as funções contratadas com zelo, dedicando-se ao exercício de suas atribuições.</li>
<li>Obedecer às normas internas, aos regulamentos e aos procedimentos de segurança e saúde do trabalho.</li>
<li>Guardar sigilo sobre as informações confidenciais da empresa, mesmo após o término do contrato.</li>
<li>Cumprir as leis trabalhistas, fiscais e previdenciárias aplicáveis.</li>
</ul>
<h2>6. Obrigações do EMPREGADOR</h2>
<ul>
<li>Proporcionar condições adequadas ao exercício das funções contratadas.</li>
<li>Pagar a remuneração e os benefícios nas datas convencionadas.</li>
<li>Manter ambiente de trabalho seguro e assinar os documentos trabalhistas necessários.</li>
</ul>
<h2>7. Rescisão</h2>
<p>Qualquer das partes poderá rescindir o contrato, sem ônus, mediante aviso prévio de 30 (trinta) dias corridos, respeitadas as indenizações previstas na legislação.</p>
<h2>8. Foro</h2>
<p>Fica eleito o foro da comarca de <strong>{{empresa_endereco}}</strong> para dirimir as controvérsias decorrentes deste contrato.</p>
<p>E por estarem justos e contratados, firmam o presente instrumento em duas vias de igual teor.</p>
<p>Local e data: {{data_inicio}}.</p>`;

const TERMO_CONFIDENCIALIDADE = `<h1>Termo de Confidência</h1>
<p>De um lado <strong>{{empresa_nome}}</strong>, doravante denominada <strong>PARTE DECLARANTE</strong>, e de outro <strong>{{cliente_nome}}</strong>, portador do documento <strong>{{cliente_documento}}</strong>, com endereço em <strong>{{cliente_endereco}}</strong>, doravante denominado <strong>DECLARANTE RECEBEDOR</strong>, resolvem celebrar o presente Termo de Confidência, mediante as cláusulas a seguir:</p>
<h2>1. Objeto</h2>
<p>O presente termo tem por objeto o compromisso de <strong>{{objeto}}</strong>, por meio do qual o DECLARANTE RECEBEDOR se obriga a não divulgar, a qualquer título ou forma, informações confidenciais da PARTE DECLARANTE que lhe sejam confiadas no período de <strong>{{data_inicio}}</strong> a <strong>{{data_fim}}</strong>.</p>
<h2>2. Definição de informação confidencial</h2>
<p>Consideram-se confidenciais todas as informações técnicas, comerciais, financeiras, operacionais ou de qualquer natureza reveladas por meio escrito, oral, eletrônico ou por qualquer outra forma, bem como documentos, planilhas, contratos, bases de dados, sistemas e materiais de trabalho.</p>
<h2>3. Obrigações do DECLARANTE RECEBEDOR</h2>
<ul>
<li>Utilizar as informações confidenciais exclusivamente para os fins previstos neste termo.</li>
<li>Não reproduzir, copiar ou divulgar as informações a terceiros sem autorização prévia e por escrito da PARTE DECLARANTE.</li>
<li>Adotar medidas de segurança para proteger as informações confidenciais de acesso não autorizado.</li>
<li>Comunicar imediatamente qualquer incidente de divulgação, perda ou acesso indevido.</li>
</ul>
<h2>4. Prazo de vigência</h2>
<p>As obrigações aqui assumidas vigoram de <strong>{{data_inicio}}</strong> até <strong>{{data_fim}}</strong> e permanecerão válidas por 5 (cinco) anos contados do término deste termo, mesmo após o encerramento da relação entre as partes.</p>
<h2>5. Penalidade</h2>
<p>O descumprimento de qualquer das obrigações previstas neste termo sujeitará o DECLARANTE RECEBEDOR ao pagamento de indenização de <strong>{{valor}}</strong>, sem prejuízo das medidas extrajudiciais e judiciais cabíveis.</p>
<h2>6. Devolução das informações</h2>
<p>Encerrado o prazo de vigência, o DECLARANTE RECEBEDOR devolverá ou destruirá, conforme instrução da PARTE DECLARANTE, todos os documentos e materiais que contenham informações confidenciais, vedada qualquer retenção de cópias.</p>
<h2>7. Foro</h2>
<p>Fica eleito o foro da comarca de <strong>{{empresa_endereco}}</strong> para dirimir as controvérsias decorrentes deste termo.</p>
<p>E por estarem justos e contratados, firmam o presente termo em duas vias de igual teor.</p>
<p>Local e data: {{data_inicio}}.</p>`;

/** Modelos padrão utilizados para popular a primeira visita ao módulo de modelos. */
export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Prestação de Serviços",
    category: "Serviços",
    html: PRESTACAO_SERVICOS,
    headerHtml: HEADER_PADRAO,
    footerHtml: FOOTER_PADRAO,
  },
  {
    name: "Contrato de Trabalho",
    category: "Pessoal",
    html: CONTRATO_TRABALHO,
    headerHtml: HEADER_PADRAO,
    footerHtml: FOOTER_PADRAO,
  },
  {
    name: "Termo de Confidência",
    category: "Confidencialidade",
    html: TERMO_CONFIDENCIALIDADE,
    headerHtml: HEADER_PADRAO,
    footerHtml: FOOTER_PADRAO,
  },
];

/**
 * Garante que a empresa tenha os modelos padrão. Idempotente: só cria os modelos
 * quando a empresa ainda não possui nenhum (sem contar os excluídos).
 */
export async function ensureDefaultTemplates(companyId: string, userId: string): Promise<number> {
  const existing = await db.contractTemplate.count({ where: { companyId, deletedAt: null } });
  if (existing > 0) return 0;

  try {
    const created = await db.$transaction(
      DEFAULT_TEMPLATES.map((t) =>
        db.contractTemplate.create({
          data: {
            companyId,
            name: t.name,
            category: t.category,
            content: { html: t.html },
            headerHtml: t.headerHtml ?? null,
            footerHtml: t.footerHtml ?? null,
            createdBy: userId,
          },
        }),
      ),
    );
    return created.length;
  } catch (e) {
    console.error("[TEMPLATES SEED ERROR]", e);
    return 0;
  }
}
