-- ┌───────────────────────────────────────────────────────────────────┐
-- │ RPC publica: get_passaporte(p_matricula)                          │
-- │                                                                    │
-- │ Retorna todos os dados necessarios pra renderizar o Passaporte de │
-- │ Leitura em um unico round-trip, acessivel sem login (role anon).  │
-- │                                                                    │
-- │ Executa com security definer -> ignora RLS, mas so expoe os campos │
-- │ selecionados aqui.                                                 │
-- └───────────────────────────────────────────────────────────────────┘

create or replace function public.get_passaporte(p_matricula int)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_result json;
  v_turma_id int;
begin
  -- aluno + turma_id (usado na query de ranking)
  select a.turma_id into v_turma_id
  from alunos a
  where a.matricula = p_matricula;

  -- Se aluno nao existe, retorna null pra frontend mostrar "nao encontrado"
  if not found then
    return null;
  end if;

  with empr as (
    select
      e.id,
      e.status,
      e.data_saida,
      e.data_devolucao_real,
      e.prazo_final,
      ac.titulo,
      ac.autor,
      ac.tipo,
      ac.genero,
      ac.imagem_url
    from emprestimos e
    join livros_exemplares le on le.id = e.exemplar_id
    join acervo ac on ac.id = le.acervo_id
    where e.matricula = p_matricula
  ),
  -- ranking anual: empréstimos DEVOLVIDOS no ano corrente.
  -- Agregamos separadamente para geral e por turma: se um aluno mudou de
  -- turma no meio do ano, seus emprestimos ficam em turma_ids diferentes,
  -- mas o ranking geral ainda deve somar tudo num numero so por aluno.
  totais_geral as (
    select
      e.matricula,
      count(*) as total
    from emprestimos e
    where e.status = 'DEVOLVIDO'
      and e.data_devolucao_real >= (date_trunc('year', current_date))::date
    group by e.matricula
  ),
  totais_turma as (
    select
      e.matricula,
      count(*) as total
    from emprestimos e
    where e.status = 'DEVOLVIDO'
      and e.data_devolucao_real >= (date_trunc('year', current_date))::date
      and e.turma_id = v_turma_id
    group by e.matricula
  ),
  rk_geral as (
    select matricula, total, row_number() over (order by total desc, matricula) as pos
    from totais_geral
  ),
  rk_turma as (
    select matricula, total, row_number() over (order by total desc, matricula) as pos
    from totais_turma
  )
  select json_build_object(
    'aluno', (
      select json_build_object(
        'matricula', a.matricula,
        'nome', a.nome,
        'turma', t.nome,
        'turma_id', a.turma_id,
        'foto_url', a.foto_url,
        'ativo', a.ativo
      )
      from alunos a
      left join turmas t on t.id = a.turma_id
      where a.matricula = p_matricula
    ),
    'carimbos', coalesce(
      (select json_agg(
        json_build_object(
          'emprestimo_id', empr.id,
          'titulo', empr.titulo,
          'autor', empr.autor,
          'tipo', empr.tipo,
          'genero', empr.genero,
          'imagem_url', empr.imagem_url,
          'data_saida', empr.data_saida,
          'data_devolucao_real', empr.data_devolucao_real,
          'prazo_final', empr.prazo_final,
          'status', empr.status
        ) order by empr.data_saida desc
      ) from empr),
      '[]'::json
    ),
    'ranking', json_build_object(
      'geral', (select pos from rk_geral where matricula = p_matricula),
      'geralTotal', (select count(*) from rk_geral),
      'turma', (select pos from rk_turma where matricula = p_matricula),
      'turmaTotal', (select count(*) from rk_turma),
      'totalAluno', coalesce((select total from totais_geral where matricula = p_matricula), 0)
    )
  )
  into v_result;

  return v_result;
end;
$$;

-- Permite execucao por anon e authenticated (a rota /passaporte e publica)
revoke all on function public.get_passaporte(int) from public;
grant execute on function public.get_passaporte(int) to anon, authenticated;
