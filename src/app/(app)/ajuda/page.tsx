import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Lightbulb, List, MessageSquareQuote, ScrollText } from "lucide-react";
import { requireUser } from "@/server/session";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { CopyExample, GuiaSteps, type GuiaStep } from "./guia-steps";

export const metadata: Metadata = { title: "Como usar" };
export const dynamic = "force-dynamic";

/** Índice exibido no topo da página. */
const INDICE = [
  { href: "#criar-conta", label: "1. Criar conta" },
  { href: "#modelos", label: "2. Modelos" },
  { href: "#criar-contrato", label: "3. Novo contrato" },
  { href: "#enviar", label: "4. Enviar" },
  { href: "#assinar", label: "5. Assinar" },
  { href: "#acompanhar", label: "6. Acompanhar" },
  { href: "#configurar", label: "7. Configurar" },
  { href: "#conta", label: "8. Conta" },
  { href: "#mensagens", label: "Mensagens prontas" },
  { href: "#faq", label: "Perguntas frequentes" },
  { href: "#glossario", label: "Glossário" },
];

/** Passo a passo completo, do cadastro até o acompanhamento. */
const PASSOS: GuiaStep[] = [
  {
    id: "criar-conta",
    numero: 1,
    tela: "Criar conta",
    rota: "/cadastro",
    resumo: "Cadastre a empresa e entre na plataforma sem esperar confirmação de e-mail.",
    fazer: [
      "Preencha o nome da empresa, o seu nome, o e-mail corporativo e uma senha com pelo menos 12 caracteres.",
      "Clique em Criar conta e guarde a senha em local seguro.",
    ],
    acontece: [
      "A empresa é criada na hora e você entra como administrador dela, sem precisar confirmar o e-mail.",
      "Você chega direto ao painel, com a sessão ativa por 8 horas (ou 30 dias se marcar “Manter conectado” no login).",
    ],
    atalhos: [
      { label: "Ver tela de login", href: "/login" },
      { label: "Ir para o dashboard", href: "/dashboard" },
    ],
  },
  {
    id: "modelos",
    numero: 2,
    tela: "Modelos",
    rota: "/modelos",
    resumo: "Use os modelos prontos ou crie os seus com variáveis que se preenchem sozinhas.",
    fazer: [
      "Abra Modelos: já existem três modelos padrão — Prestação de Serviços, Contrato de Trabalho e Termo de Confidência.",
      "Para adaptar, abra o modelo, edite o HTML e use variáveis como {{cliente_nome}}, {{valor}} e {{data_inicio}}.",
      "Acompanhe o preview ao vivo: as variáveis aparecem destacadas enquanto você digita.",
    ],
    acontece: [
      "Cada variável vira um campo preenchível no passo 3 da criação do contrato.",
      "Valores em branco são preenchidos automaticamente com os dados do cliente e da sua empresa.",
    ],
    atalhos: [
      { label: "Criar modelo", href: "/modelos/novo" },
      { label: "Ver lista de modelos", href: "/modelos" },
    ],
  },
  {
    id: "criar-contrato",
    numero: 3,
    tela: "Novo contrato",
    rota: "/contratos/novo",
    resumo: "Um assistente em 3 passos leva do cadastro do cliente até os signatários.",
    fazer: [
      "Passo 1 — Dados: escolha o cliente, escreva o título, selecione o modelo, informe o valor, as datas e o prazo de validade em dias.",
      "Passo 2 — Cofre: escolha a pasta onde o contrato será guardado ou crie uma nova na hora.",
      "Passo 3 — Variáveis e signatários: confira os valores do modelo e cadastre nome, e-mail e papel de cada signatário.",
    ],
    acontece: [
      "O contrato nasce como Rascunho e recebe um número sequencial com o prefixo da empresa (ex.: CT-2026-0001).",
      "Você é levado à tela do contrato, onde ficam as versões, a pré-visualização e o botão de envio.",
    ],
    atalhos: [
      { label: "Cadastrar cliente", href: "/clientes/novo" },
      { label: "Ver contratos", href: "/contratos" },
    ],
  },
  {
    id: "enviar",
    numero: 4,
    tela: "Enviar para assinatura",
    rota: "/contratos/[id]",
    resumo: "Defina os signatários, trave a versão do documento e gere o link de cada um.",
    fazer: [
      "Abra o contrato e role até a área Signatários.",
      "Confira nome, e-mail e papel de cada pessoa e clique em Enviar para assinatura.",
      "Copie os links que aparecem na tela (há um botão Copiar em cada um) e envie ao cliente.",
    ],
    acontece: [
      "A versão atual do documento é travada: o conteúdo enviado não pode mais ser alterado.",
      "Um link /s/<token> é criado para cada signatário e o app tenta enviá-lo por e-mail quando o Resend está configurado.",
      "Por segurança, o banco guarda apenas o hash do token — o link em claro só aparece logo após o envio.",
    ],
    atalhos: [
      { label: "Ver modelos de mensagem", href: "#mensagens" },
    ],
  },
  {
    id: "assinar",
    numero: 5,
    tela: "O cliente assina",
    rota: "/s/<token>",
    resumo: "O signatário abre o link, lê o documento, preenche, assina e confirma.",
    fazer: [
      "O cliente abre o link no navegador e lê o documento completo.",
      "Ele preenche os campos pedidos, assina digitando o nome ou desenhando no canvas e marca a caixa de concordância.",
      "Clique em Assinar documento — ou, se não puder aceitar, use Recusar assinatura e informe o motivo.",
    ],
    acontece: [
      "Cada assinatura registra o documento, a data e hora, o IP e o dispositivo, com um código único verificável.",
      "Quando todos os signatários assinam, o contrato passa para Assinado e a empresa recebe uma notificação.",
    ],
    atalhos: [],
  },
  {
    id: "acompanhar",
    numero: 6,
    tela: "Acompanhar",
    rota: "/assinaturas",
    resumo: "Veja a prova de cada assinatura, os avisos da plataforma e o cofre de documentos.",
    fazer: [
      "Em Assinaturas, filtre por signatário, método ou período e expanda a linha para ver os campos preenchidos.",
      "Abra Ver certificado para imprimir a prova da assinatura ou exporte o histórico em CSV.",
      "Em Notificações, acompanhe avisos de assinatura e recusa; em Cofre, guarde contratos e documentos por pasta.",
    ],
    acontece: [
      "O certificado reúne a prova completa: hash do documento, código único, IP e dispositivo.",
      "Os contratos guardados no cofre continuam vinculados ao contrato e podem ser baixados quando quiser.",
    ],
    atalhos: [
      { label: "Abrir assinaturas", href: "/assinaturas" },
      { label: "Abrir notificações", href: "/notificacoes" },
      { label: "Abrir cofre", href: "/cofre" },
    ],
  },
  {
    id: "configurar",
    numero: 7,
    tela: "Configurar a empresa",
    rota: "/empresa",
    resumo: "Deixe a empresa com a sua cara: dados, cores, prefixo de contratos e equipe.",
    fazer: [
      "Em Minha empresa, preencha razão social, CNPJ, endereço e escolha as cores e o prefixo dos números de contrato.",
      "Em Equipe, adicione pessoas e defina o papel: Administrador, Colaborador, Comercial, Financeiro ou Visualizador.",
      "Em Configurações, ajuste a validade padrão, o aviso por e-mail e a exigência de aceite, além de conferir o diagnóstico das variáveis de ambiente e os logs de atividade.",
    ],
    acontece: [
      "Cores e prefixo passam a ser usados nos próximos documentos e contratos criados.",
      "Toda ação relevante fica registrada no log de atividade da empresa, com autor e data.",
    ],
    atalhos: [
      { label: "Gerenciar equipe", href: "/empresa/equipe" },
      { label: "Abrir configurações", href: "/configuracoes" },
    ],
  },
  {
    id: "conta",
    numero: 8,
    tela: "Conta e acesso",
    rota: "/conta",
    resumo: "Mantenha seus dados atualizados e controle a sessão da sua conta.",
    fazer: [
      "Em Minha conta, atualize nome e e-mail e troque a senha quando quiser.",
      "No login, marque Manter conectado para ficar 30 dias conectado; sem essa opção a sessão expira em 8 horas.",
      "Use Sair de todos os lugares se suspeitar de acesso indevido.",
    ],
    acontece: [
      "Cada consulta é filtrada pela empresa da sessão: ninguém enxerga contratos de outra empresa.",
      "Usuários desativados pela equipe perdem o acesso na próxima requisição.",
    ],
    atalhos: [
      { label: "Abrir minha conta", href: "/conta" },
    ],
  },
];

/** Textos prontos para copiar e enviar ao cliente. */
const EXEMPLOS = [
  {
    titulo: "Mensagem para o cliente (e-mail)",
    descricao: "O modelo principal: substitua os campos entre chaves.",
    texto: `Olá {nome}, enviamos o contrato {número} para assinatura.

Acesse o link: {link}
Prazo para assinar: {dias} dias

Qualquer dúvida, é só responder este e-mail.

Att,
{empresa}`,
  },
  {
    titulo: "Mensagem curta (WhatsApp)",
    descricao: "Para mandar o link no celular, direto no conversa.",
    texto: `Oi {nome}! O contrato {número} está pronto para assinatura: {link}

Você tem {dias} dias para assinar. Qualquer dúvida, me chama.`,
  },
  {
    titulo: "Lembrete antes do vencimento",
    descricao: "Para cobrar a assinatura antes do prazo terminar.",
    texto: `Oi {nome}, passando para lembrar: o contrato {número} ainda está aguardando sua assinatura e o prazo termina em {dias} dias.

Link: {link}`,
  },
  {
    titulo: "Quando o cliente pede ajuste",
    descricao: "Você vai corrigir o documento e gerar um novo link.",
    texto: `Oi {nome}, recebemos o seu retorno sobre o contrato {número}. Vou preparar a versão atualizada e te envio um novo link de assinatura.

Obrigado!`,
  },
];

/** Variáveis que o app reconhece e preenche sozinho. */
const VARIAVEIS = `{{cliente_nome}} · {{cliente_documento}} · {{cliente_email}} · {{cliente_empresa}}
{{cliente_endereco}} · {{cliente_cidade}} · {{cliente_uf}} · {{cliente_cep}}
{{empresa_nome}} · {{empresa_razao_social}} · {{empresa_cnpj}} · {{empresa_endereco}}
{{empresa_telefone}} · {{empresa_email}}
{{valor}} · {{data_inicio}} · {{data_fim}} · {{objeto}}`;

/** Perguntas frequentes. */
const FAQ = [
  {
    pergunta: "O cliente precisa criar conta?",
    resposta:
      "Não. O signatário só precisa abrir o link /s/<token> no navegador. Não pedimos senha, cadastro nem download de aplicativo — no máximo o preenchimento de alguns campos e a assinatura.",
  },
  {
    pergunta: "Precisa instalar alguma coisa?",
    resposta:
      "Não. Tudo acontece no navegador, em computador, tablet ou celular, com internet. Não existe app para instalar nem plugin de navegador.",
  },
  {
    pergunta: "O link expira?",
    resposta:
      "Sim. O link expira na data calculada pelo campo Prazo de validade (dias), preenchido na criação do contrato (por padrão, 30 dias). Depois disso a página avisa que o link expirou e pede um novo link ao responsável.",
  },
  {
    pergunta: "Posso reenviar?",
    resposta:
      "Pode, desde que ninguém tenha assinado ainda. Na área Signatários do contrato, use Gerar novos links: os signatários que ainda não assinaram recebem links novos e os antigos deixam de funcionar. Depois da primeira assinatura, a opção não aparece mais.",
  },
  {
    pergunta: "Onde fica o comprovante?",
    resposta:
      "Em Assinaturas. Cada linha mostra o signatário, o método (digitada, desenhada ou enviada), a data e hora, o IP e o código único. O botão Ver certificado abre a prova completa, pronta para imprimir ou guardar em PDF.",
  },
  {
    pergunta: "O que é o cofre?",
    resposta:
      "É a pasta onde você guarda os contratos da empresa e os documentos enviados. Cada contrato pode ser vinculado a um cofre (por exemplo, Contratos 2026), o que ajuda a manter tudo organizado e fácil de localizar.",
  },
  {
    pergunta: "O que é o token de assinatura?",
    resposta:
      "É a parte aleatória do link /s/<token> que dá acesso ao documento. Por segurança, o app guarda no banco apenas o hash do token (HMAC com o TOKEN_PEPPER): se alguém vazar o banco, os links não abrem.",
  },
  {
    pergunta: "Por que os links sumiram depois que enviei?",
    resposta:
      "Isso é proposital: o link em claro aparece somente logo após o envio (ou depois de gerar novos links), porque no banco fica apenas o hash do token. Se você perdeu os links, use Gerar novos links na área Signatários.",
  },
  {
    pergunta: "O e-mail com o link não chegou. O que faço?",
    resposta:
      "O envio automático depende da variável RESEND_API_KEY, que aparece em Configurações → Segurança. Enquanto o e-mail não estiver configurado, copie o link exibido na tela do contrato e envie por WhatsApp, SMS ou e-mail.",
  },
  {
    pergunta: "Posso corrigir o contrato depois de assinado?",
    resposta:
      "Não. A versão enviada é travada no momento do envio. Para mudar o documento, edite as variáveis antes de enviar ou crie um novo contrato — a assinatura anterior continua válida como histórico.",
  },
  {
    pergunta: "Quantas pessoas podem assinar?",
    resposta:
      "Quantas você quiser. No passo 3 da criação do contrato (ou na área Signatários) você adiciona nome, e-mail e papel de cada pessoa. O contrato só passa para Assinado quando todos assinarem.",
  },
  {
    pergunta: "Quem da minha equipe pode enviar contratos?",
    resposta:
      "Os papéis definem isso: Administrador faz tudo, Colaborador e Comercial operam os contratos, Financeiro acompanha valores e Visualizador apenas consulta. A gestão fica em Minha empresa → Equipe.",
  },
];

/** Glossário dos termos usados na plataforma. */
const GLOSSARIO = [
  {
    termo: "Contrato",
    definicao:
      "Documento enviado para assinatura. Tem um número sequencial (prefixo da empresa + ano + número, ex.: CT-2026-0001) e um status: Rascunho, Enviado, Aguardando, Parcialmente assinado, Assinado, Recusado, Vencido ou Cancelado.",
  },
  {
    termo: "Versão",
    definicao:
      "Cópia do documento gerada a partir do modelo com as variáveis preenchidas. Cada alteração cria uma versão nova; ao enviar para assinatura a versão é travada e recebe um hash SHA-256 do conteúdo.",
  },
  {
    termo: "Cofre",
    definicao:
      "Pasta da empresa onde ficam guardados os contratos e os documentos enviados. Ajuda a organizar por cliente, ano ou tipo de contrato, e nada sai da empresa.",
  },
  {
    termo: "Signatário",
    definicao:
      "Pessoa que vai assinar. É cadastrada com nome, e-mail e papel (Contratante, Contratada, Testemunha, Representante legal...). Cada uma recebe um link próprio de assinatura.",
  },
  {
    termo: "Assinatura",
    definicao:
      "Registro do ato de assinar: valor do campo, método (digitada, desenhada ou enviada), data e hora, IP, dispositivo e um código único verificável.",
  },
  {
    termo: "Token",
    definicao:
      "Trecho aleatório do link de assinatura (/s/<token>) que autoriza o acesso ao documento. No banco é gravado apenas o hash dele, nunca o valor original.",
  },
  {
    termo: "Certificado",
    definicao:
      "Documento imprimível com a prova de uma assinatura: hash do arquivo, código único, IP, dispositivo e data. Serve como comprovante para auditoria e contestação.",
  },
  {
    termo: "RLS (Row Level Security)",
    definicao:
      "Proteção do banco em que cada linha só é acessível conforme o contexto da empresa. Como o app só fala com o banco pelo servidor, o acesso direto às tabelas fica bloqueado.",
  },
];

export default async function AjudaPage() {
  // Garante que a página só seja entregue para quem está autenticado.
  await requireUser();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Como usar"
        description="Guia passo a passo: da criação da conta até o comprovante de assinatura."
      />

      {/* ------------------------------- ÍNDICE ------------------------------- */}
      <Card className="mb-6">
        <CardHeader
          title="Índice"
          action={
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-mute">
              <List className="h-4 w-4" aria-hidden /> 8 passos
            </span>
          }
        />
        <nav aria-label="Índice do guia" className="flex flex-wrap gap-2 p-4">
          {INDICE.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex h-9 items-center rounded-lg border border-paper-line bg-white px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </Card>

      {/* ---------------------------- PASSO A PASSO ---------------------------- */}
      <section aria-labelledby="titulo-passos" className="mb-8">
        <h2 id="titulo-passos" className="mb-1 text-lg font-extrabold tracking-tight">
          Passo a passo
        </h2>
        <p className="mb-4 text-sm text-ink-mute">
          Do cadastro da empresa ao certificado de assinatura — em oito etapas.
        </p>
        <GuiaSteps steps={PASSOS} />
      </section>

      {/* ------------------------- MENSAGENS PRONTAS ------------------------- */}
      <section id="mensagens" className="mb-8 scroll-mt-24">
        <Card>
          <CardHeader
            title="Mensagens prontas para copiar"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-mute">
                <MessageSquareQuote className="h-4 w-4" aria-hidden /> Substitua os campos
              </span>
            }
          />
          <div className="p-5">
            <p className="mb-4 text-sm text-ink-mute">
              Troque os campos entre chaves ({`{nome}`}, {`{número}`}, {`{link}`}, {`{dias}`}) pelos dados
              reais do contrato e envie a mensagem como preferir.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {EXEMPLOS.map((exemplo) => (
                <CopyExample
                  key={exemplo.titulo}
                  titulo={exemplo.titulo}
                  descricao={exemplo.descricao}
                  texto={exemplo.texto}
                />
              ))}
            </div>
            <div className="mt-4">
              <CopyExample
                titulo="Variáveis disponíveis para o seu modelo"
                descricao="Copie e use dentro do HTML do modelo em Modelos. As {{cliente_*}} e {{empresa_*}} são preenchidas sozinhas."
                texto={VARIAVEIS}
              />
            </div>
          </div>
        </Card>
      </section>

      {/* ------------------------- PERGUNTAS FREQUENTES ------------------------- */}
      <section id="faq" className="mb-8 scroll-mt-24">
        <Card>
          <CardHeader title="Perguntas frequentes" />
          <div className="space-y-3 p-5">
            {FAQ.map((item) => (
              <details key={item.pergunta} className="group rounded-xl border border-paper-line bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold marker:hidden">
                  <span>{item.pergunta}</span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-ink-mute transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="border-t border-paper-line px-4 py-3.5 text-sm leading-relaxed text-ink-soft">
                  {item.resposta}
                </div>
              </details>
            ))}
          </div>
        </Card>
      </section>

      {/* ------------------------------ GLOSSÁRIO ------------------------------ */}
      <section id="glossario" className="mb-8 scroll-mt-24">
        <Card>
          <CardHeader
            title="Glossário"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-mute">
                <ScrollText className="h-4 w-4" aria-hidden /> Termos da plataforma
              </span>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-mute">
                  <th scope="col" className="w-56 px-5 py-2.5 font-semibold">
                    Termo
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-semibold">
                    O que significa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {GLOSSARIO.map((item) => (
                  <tr key={item.termo}>
                    <th scope="row" className="px-5 py-3 text-left align-top font-semibold">
                      {item.termo}
                    </th>
                    <td className="px-5 py-3 align-top text-ink-soft">{item.definicao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* -------------------------------- DICA -------------------------------- */}
      <div className="rounded-xl border border-warn/30 bg-warn-tint p-5">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
          <div>
            <p className="font-bold text-warn">Dica</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              O link de assinatura só aparece logo após o envio (por segurança só guardamos o hash). Se
              perder, use &quot;Gerar novos links&quot;.
            </p>
            <Link
              href="/contratos"
              className="mt-3 inline-flex h-9 items-center rounded-lg border border-paper-line bg-white px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper"
            >
              Ir para os contratos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
