import { TesteAction } from "./teste-action";

export const dynamic = "force-dynamic";

export default function TesteActionPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Teste de Server Action</h1>
      <TesteAction />
    </div>
  );
}
