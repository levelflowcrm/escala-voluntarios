import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaPerfil } from "./tela";

export default async function Perfil() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const [{ data: p }, { data: mins }, { data: habs }, { data: fotoLinha }] = await Promise.all([
    supabase.rpc("meus_dados").single<{ nome: string; nome_completo: string | null; email: string | null; celular: string | null; aniversario: string | null }>(),
    supabase.from("membros_ministerio").select("papel, ministerios!inner(nome)").eq("pessoa_id", eu),
    supabase.from("habilitacoes").select("nivel, funcoes!inner(nome, ministerios!inner(nome))").eq("pessoa_id", eu),
    supabase.from("fotos_perfil").select("foto").eq("pessoa_id", eu).maybeSingle(),
  ]);
  if (!p) redirect("/");

  return (
    <TelaPerfil
      nome={p.nome}
      foto={fotoLinha?.foto ?? null}
      email={p.email ?? ""}
      inicial={{ nomeCompleto: p.nome_completo ?? "", celular: p.celular ?? "", aniversario: p.aniversario ?? "" }}
      ministerios={(mins ?? []).map((m) => ({
        nome: (m.ministerios as unknown as { nome: string }).nome,
        coordenador: m.papel === "coordenador",
      }))}
      funcoes={(habs ?? [])
        .map((h) => {
          const f = h.funcoes as unknown as { nome: string; ministerios: { nome: string } };
          return { nome: f.nome, area: f.ministerios.nome, apto: h.nivel === "apto" };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))}
    />
  );
}
