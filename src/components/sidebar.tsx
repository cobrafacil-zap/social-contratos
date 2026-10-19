"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, FileText, FilePlus2, Copy, Users, Vault, PenLine, Bell, Settings, Building2, UserCircle, HelpCircle } from "lucide-react";
import { Logo } from "./logo";

type Item = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; ready: boolean };

const GROUPS: { title?: string; items: Item[] }[] = [
  { items: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, ready: true },
    { label: "Contratos", href: "/contratos", icon: FileText, ready: true },
    { label: "Novo contrato", href: "/contratos/novo", icon: FilePlus2, ready: true },
    { label: "Modelos", href: "/modelos", icon: Copy, ready: true },
    { label: "Clientes", href: "/clientes", icon: Users, ready: true },
  ] },
  { title: "Documentos", items: [
    { label: "Cofre de contratos", href: "/cofre", icon: Vault, ready: true },
    { label: "Assinaturas", href: "/assinaturas", icon: PenLine, ready: true },
    { label: "Notificações", href: "/notificacoes", icon: Bell, ready: true },
  ] },
  { title: "Conta", items: [
    { label: "Configurações", href: "/configuracoes", icon: Settings, ready: true },
    { label: "Minha empresa", href: "/empresa", icon: Building2, ready: true },
    { label: "Minha conta", href: "/conta", icon: UserCircle, ready: true },
    { label: "Como usar", href: "/ajuda", icon: HelpCircle, ready: true },
  ] },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <nav aria-label="Principal" className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <div className="px-2 pb-2 pt-1"><Logo /></div>
      {GROUPS.map((g, i) => (
        <div key={i}>
          {g.title && <p className="mb-1.5 px-3 text-xs font-semibold text-ink-mute">{g.title}</p>}
          <ul className="space-y-0.5">
            {g.items.map(({ label, href, icon: Icon, ready }) => {
              const active = path === href || (href !== "/dashboard" && path.startsWith(href + "/"));
              const base = "flex h-10 items-center gap-3 rounded-lg px-3 text-[15px] font-medium";
              return (
                <li key={href}>
                  {ready ? (
                    <Link href={href} aria-current={active ? "page" : undefined}
                      className={clsx(base, active ? "bg-cobalt-tint text-cobalt" : "text-ink-soft hover:bg-paper")}>
                      <Icon className="h-[18px] w-[18px]" />{label}
                    </Link>
                  ) : (
                    <span aria-disabled="true" title="Disponível nos próximos módulos"
                      className={clsx(base, "cursor-not-allowed text-ink-mute/70")}>
                      <Icon className="h-[18px] w-[18px]" />{label}
                      <span className="ml-auto rounded-md bg-paper px-1.5 py-0.5 text-[11px] font-semibold text-ink-mute">em breve</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
