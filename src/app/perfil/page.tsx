import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaPerfil } from "./tela";

export default async function Perfil() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const [{ data: p }, { data: mins }, { data: habs }] = await Promise.all([
    supabase.from("pessoas").select("nome, nome_completo, email, celular, aniversario").eq("id", eu).single(),
    supabase.from("membros_ministerio").select("papel, ministerios!inner(nome)").eq("pessoa_id", eu),
    supabase.from("habilitacoes").select("nivel, funcoes!inner(nome)").eq("pessoa_id", eu),
  ]);
  if (!p) redirect("/");

  return (
    <TelaPerfil
      nome={p.nome}
      email={p.email ?? ""}
      inicial={{ nomeCompleto: p.nome_completo ?? "", celular: p.celular ?? "", aniversario: p.aniversario ?? "" }}
      ministerios={(mins ?? []).map((m) => ({
        nome: (m.ministerios as unknown as { nome: string }).nome,
        coordenador: m.papel === "coordenador",
      }))}
      funcoes={(habs ?? [])
        .map((h) => ({ nome: (h.funcoes as unknown as { nome: string }).nome, apto: h.nivel === "apto" }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))}
    />
  );
}
