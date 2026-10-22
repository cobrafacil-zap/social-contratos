/**
 * Preenchimento automático das variáveis do modelo a partir dos dados reais
 * (empresa, cliente e contrato). O usuário não precisa editar nada: o app
 * detecta as variáveis do modelo e preenche cada uma com o dado correspondente.
 */

export type VariableContext = {
  company: {
    name: string;
    legalName: string | null;
    cnpj: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    responsibleName: string | null;
  };
  client: {
    name: string;
    companyName: string | null;
    document: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  contract: {
    title: string;
    value: string | null;
    startDate: Date | null;
    endDate: Date | null;
    expiresInDays: number | null;
    object?: string | null;
  };
  today: Date;
};

function formatDateBR(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("pt-BR");
}

function formatCurrencyBR(value: string | null): string {
  if (!value) return "";
  const n = Number(value);
  if (Number.isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Extrai a cidade de um endereço brasileiro:
 *   "Rua das Flores, 100 - Centro, São Paulo/SP" -> "São Paulo"
 *   "Rua X, 100 - São Paulo/SP"                 -> "São Paulo"
 *   "São Paulo/SP"                              -> "São Paulo"
 *
 * O endereço "Rua das Flores, 100" **não** tem cidade: devolve "" em vez de "100".
 */
function guessCity(address: string | null): string {
  if (!address) return "";
  const cleaned = address.trim();
  if (!cleaned) return "";

  // Fica com a parte depois do último " - " (onde costuma vir "Cidade/UF").
  const tail = cleaned.includes(" - ") ? cleaned.slice(cleaned.lastIndexOf(" - ") + 3) : cleaned;

  // Percorre os trechos de trás para frente e pega o primeiro que tenha letras
  // (assim "100" e "1234" nunca são aceitos como cidade).
  const segments = tail
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .reverse();

  for (const seg of segments) {
    const candidate = seg.split("/")[0].trim();
    if (!candidate) continue;
    if (/^\d+$/.test(candidate)) continue; // só número: não é cidade
    if (!/[A-Za-zÀ-ÿ]/.test(candidate)) continue; // sem letras: não é cidade
    return candidate;
  }
  return "";
}

function guessState(address: string | null): string {
  if (!address) return "";
  const m = address.match(/\/([A-Z]{2})\s*$/);
  return m ? m[1] : "";
}

/** Monta o texto de um valor por extenso (números comuns). */
export function numeroExtenso(n: number): string {
  const unidades = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
  const milhoes = ["", "mil", "milhões", "milhões", "milhões"];
  if (n === 0) return "zero reais";
  if (n > 999_999_999) return "";
  const partes: string[] = [];
  const separar = (n: number) => [
    Math.floor(n / 1_000_000),
    Math.floor((n % 1_000_000) / 1000),
    n % 1000,
  ];
  const [mi, mil, uni] = separar(Math.trunc(n));
  if (mi) partes.push(`${milhoes[mi]} ${mi === 1 ? "mil" : "mil"}`);
  if (mil) partes.push(`${mil} mil`);
  if (uni) {
    if (uni === 100) partes.push("cem");
    else {
      const c = Math.floor(uni / 100);
      const d = Math.floor((uni % 100) / 10);
      const u = uni % 10;
      const txt = `${centenas[c]} ${dezenas[d]}${d && u ? " e " : ""}${u ? unidades[u] : ""}`.trim();
      partes.push(txt);
    }
  }
  const texto = partes.join(" e ").replace(/\s+/g, " ").trim();
  return `${texto} ${Number.isInteger(n) ? "reais" : "reais"}`;
}

/**
 * Devolve o valor de cada variável do modelo, usando os dados reais.
 * Variáveis sem correspondência ficam vazias (viram "—" no documento).
 */
export function buildVariables(keys: string[], ctx: VariableContext): Record<string, string> {
  const { company, client, contract } = ctx;
  const valor = formatCurrencyBR(contract.value);
  const valorNum = contract.value ? Number(contract.value) : 0;
  const clientAddress = client.address ?? "";
  const companyCity = guessCity(company.address);

  const base: Record<string, string> = {
    // Empresa
    empresa_nome: company.legalName || company.name,
    empresa_razao_social: company.legalName || company.name,
    empresa_cnpj: company.cnpj ?? "",
    empresa_cpf_cnpj: company.cnpj ?? "",
    cnpj: company.cnpj ?? "",
    empresa_endereco: company.address ?? "",
    empresa_telefone: company.phone ?? "",
    empresa_email: company.email ?? "",
    empresa_responsavel: company.responsibleName ?? "",
    // Cliente
    cliente_nome: client.name,
    cliente_razao_social: client.companyName || client.name,
    cliente_empresa: client.companyName || client.name,
    cliente_documento: client.document ?? "",
    cliente_cnpj: client.document ?? "",
    cliente_cpf_cnpj: client.document ?? "",
    cliente_email: client.email ?? "",
    cliente_telefone: client.phone ?? "",
    cliente_endereco: clientAddress,
    cliente_cidade: client.city || guessCity(clientAddress) || companyCity,
    cliente_uf: client.state || guessState(clientAddress),
    cliente_cep: client.zip ?? "",
    // Contrato
    contrato_titulo: contract.title,
    titulo: contract.title,
    objeto: contract.object || contract.title,
    valor,
    valor_extenso: valorNum > 0 ? numeroExtenso(valorNum).toUpperCase() : "",
    data_inicio: formatDateBR(contract.startDate),
    data_fim: formatDateBR(contract.endDate),
    data_assinatura: formatDateBR(ctx.today),
    prazo_dias: contract.expiresInDays ? String(contract.expiresInDays) : "",
    validade_dias: contract.expiresInDays ? String(contract.expiresInDays) : "",
    cidade: client.city || guessCity(clientAddress) || companyCity,
    estado: client.state || guessState(clientAddress),
  };

  const out: Record<string, string> = {};
  for (const key of keys) {
    out[key] = base[key] ?? "";
  }
  return out;
}
