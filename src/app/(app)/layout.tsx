import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { db } from "@/server/db";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Revalida no banco: usuário desativado perde acesso imediatamente.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, isActive: true, deletedAt: true },
  });
  if (!user || !user.isActive || user.deletedAt) {
    await signOut({ redirectTo: "/login" });
    return null;
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-paper-line bg-white lg:block"><Sidebar /></aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-paper-line bg-white/90 px-4 backdrop-blur lg:px-8">
          <MobileNav />
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <p className="text-xs text-ink-mute">{user.email}</p>
            </div>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg border border-paper-line px-3 text-sm font-semibold text-ink-soft hover:bg-paper">
                <LogOut className="h-4 w-4" aria-hidden />Sair
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
