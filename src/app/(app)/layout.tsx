import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { db } from "@/server/db";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Revalida no banco: usuário desativado perde acesso imediatamente.
  // Falha de banco não pode derrubar a página — confiamos na sessão nesse caso.
  let user: { name: string; email: string; isActive: boolean; deletedAt: Date | null } | null = null;
  try {
    user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, isActive: true, deletedAt: true },
    });
  } catch (e) {
    console.error("[LAYOUT] falha ao revalidar usuário no banco:", e);
  }

  if (user && (!user.isActive || user.deletedAt)) {
    await signOut({ redirectTo: "/login" });
    return null;
  }

  const displayName = user?.name ?? session.user.name ?? "";
  const displayEmail = user?.email ?? session.user.email ?? "";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-paper-line bg-card lg:block">
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header
          className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-paper-line bg-card/85 px-4 backdrop-blur-xl lg:px-8"
          style={{ boxShadow: "var(--sh-soft)" }}
        >
          <MobileNav />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{displayName}</p>
              <p className="text-xs text-ink-mute">{displayEmail}</p>
            </div>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button type="submit" className="btn-ghost h-10 gap-2 px-3 text-sm">
                <LogOut className="h-4 w-4" aria-hidden />Sair
              </button>
            </form>
          </div>
        </header>
        <main className="ss-page-in flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
