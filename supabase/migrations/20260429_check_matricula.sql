-- ┌───────────────────────────────────────────────────────────────────┐
-- │ RPC publica: check_matricula(p_matricula)                          │
-- │                                                                    │
-- │ Substitui o select direto em alunos feito pela landing pagina      │
-- │ /passaporte. Antes, o frontend fazia:                              │
-- │     supabase.from('alunos').select('matricula, ativo')             │
-- │                .eq('matricula', N).maybeSingle()                   │
-- │ usando a anon key. Isso permitia a um visitante enumerar quais     │
-- │ matriculas existem (e quais estao ativas) por forca bruta.         │
-- │                                                                    │
-- │ Esta RPC retorna apenas { existe, ativo } e e candidata a ser      │
-- │ rate-limitada no nivel da rota / edge se necessario, alem de       │
-- │ poder ter logica adicional sem expor a tabela ao role anon.        │
-- └───────────────────────────────────────────────────────────────────┘

create or replace function public.check_matricula(p_matricula bigint)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'existe', exists(select 1 from alunos where matricula = p_matricula),
    'ativo',  coalesce((select ativo from alunos where matricula = p_matricula), false)
  );
$$;

revoke all on function public.check_matricula(bigint) from public;
grant execute on function public.check_matricula(bigint) to anon, authenticated;
