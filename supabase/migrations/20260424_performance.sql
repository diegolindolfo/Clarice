-- ┌───────────────────────────────────────────────────────────────────┐
-- │ Performance / escalabilidade                                       │
-- │                                                                     │
-- │ 1. Indices trigram em acervo (titulo, autor) -> ILIKE '%...%'      │
-- │    passa a usar GIN em vez de sequential scan.                      │
-- │ 2. Indices em emprestimos (aluno_matricula, status+devolucao) ->   │
-- │    acelera get_passaporte e queries de relatorio.                   │
-- │ 3. Materialized view mv_ranking_ano -> precomputa ranking por      │
-- │    aluno/turma do ano corrente. get_passaporte passa a ler da view  │
-- │    em vez de recalcular window functions a cada chamada.            │
-- │ 4. Funcao refresh_mv_ranking_ano() + grant -> pode ser agendada    │
-- │    via pg_cron (ver bloco comentado no final).                      │
-- │                                                                     │
-- │ Seguro de rodar em producao: todos os CREATEs usam IF NOT EXISTS,   │
-- │ get_passaporte e redefinida via CREATE OR REPLACE mantendo a mesma  │
-- │ assinatura.                                                         │
-- └───────────────────────────────────────────────────────────────────┘

-- 1) Extensao trigram (Supabase ja deixa disponivel, so precisa habilitar no
--    schema extensions / public dependendo do projeto).
create extension if not exists pg_trgm;

-- 2) Indices trigram pra busca por titulo/autor com ILIKE '%termo%'.
--    Sem estes, /buscar escaneia a tabela inteira a cada letra digitada.
create index if not exists idx_acervo_titulo_trgm
  on public.acervo using gin (titulo gin_trgm_ops);

create index if not exists idx_acervo_autor_trgm
  on public.acervo using gin (autor gin_trgm_ops);

-- 3) Indices de emprestimos pras queries do passaporte e ranking.
create index if not exists idx_emprestimos_aluno_matricula
  on public.emprestimos (aluno_matricula);

-- Partial index: ranking anual so olha registros DEVOLVIDOs. Fica bem menor
-- que um indice cheio e resolve o filtro principal.
create index if not exists idx_emprestimos_devolvido_data
  on public.emprestimos (data_devolucao_real)
  where status = 'DEVOLVIDO';

-- Join livros_exemplares -> acervo e muito frequente (passaporte, buscar,
-- relatorios). FK costuma ja ter indice implicito em Postgres, mas garante.
create index if not exists idx_livros_exemplares_acervo_id
  on public.livros_exemplares (acervo_id);

create index if not exists idx_livros_exemplares_emprestado
  on public.livros_exemplares (emprestado);

-- 4) Materialized view com ranking anual ja agregado. Cada linha = 1 aluno
--    com sua posicao geral e posicao dentro da turma atual. get_passaporte
--    passa a fazer lookup O(1) por matricula ao inves de recalcular window
--    functions a cada chamada.
drop materialized view if exists public.mv_ranking_ano;

create materialized view public.mv_ranking_ano as
with base as (
  select
    e.aluno_matricula as matricula,
    a.turma_id,
    count(*)::int as total
  from public.emprestimos e
  left join public.alunos a on a.matricula = e.aluno_matricula
  where e.status = 'DEVOLVIDO'
    and e.data_devolucao_real >= (date_trunc('year', current_date))::date
  group by e.aluno_matricula, a.turma_id
),
ranked as (
  select
    matricula,
    turma_id,
    total,
    (row_number() over (order by total desc, matricula))::int as pos_geral,
    (count(*) over ())::int as total_geral,
    case
      when turma_id is not null
      then (row_number() over (partition by turma_id order by total desc, matricula))::int
    end as pos_turma,
    case
      when turma_id is not null
      then (count(*) over (partition by turma_id))::int
    end as total_turma
  from base
)
select * from ranked;

-- Unique index e obrigatorio pra refresh concurrently.
create unique index if not exists idx_mv_ranking_ano_matricula
  on public.mv_ranking_ano (matricula);

create index if not exists idx_mv_ranking_ano_turma_id
  on public.mv_ranking_ano (turma_id);

-- Refresh inicial (sem concurrently na primeira vez - MV ainda vazia).
refresh materialized view public.mv_ranking_ano;

-- 5) Funcao pra refresh agendado. concurrently garante que a MV continua
--    consultavel enquanto atualiza.
create or replace function public.refresh_mv_ranking_ano()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.mv_ranking_ano;
end;
$$;

revoke all on function public.refresh_mv_ranking_ano() from public;
grant execute on function public.refresh_mv_ranking_ano() to authenticated;

-- 6) get_passaporte reescrita pra ler da MV em vez de recalcular window.
--    Mantem a mesma assinatura e o mesmo shape do JSON retornado, so
--    substitui as CTEs de ranking por lookup na materialized view.
create or replace function public.get_passaporte(p_matricula bigint)
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
  select a.turma_id into v_turma_id
  from public.alunos a
  where a.matricula = p_matricula;

  if not found then
    return null;
  end if;

  with empr as (
    select
      e.id,
      e.status,
      e.data_saida,
      e.data_devolucao_real,
      coalesce(e.data_devolucao_renovada, e.data_devolucao_prevista) as prazo_final,
      ac.titulo,
      ac.autor,
      ac.tipo,
      ac.genero,
      ac.imagem_url
    from public.emprestimos e
    join public.livros_exemplares le on le.id = e.exemplar_id
    join public.acervo ac on ac.id = le.acervo_id
    where e.aluno_matricula = p_matricula
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
      from public.alunos a
      left join public.turmas t on t.id = a.turma_id
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
      'geral',       (select pos_geral   from public.mv_ranking_ano where matricula = p_matricula),
      'geralTotal',  (select total_geral from public.mv_ranking_ano where matricula = p_matricula),
      'turma',       (select pos_turma   from public.mv_ranking_ano where matricula = p_matricula and turma_id = v_turma_id),
      'turmaTotal',  (select total_turma from public.mv_ranking_ano where matricula = p_matricula and turma_id = v_turma_id),
      'totalAluno',  coalesce((select total from public.mv_ranking_ano where matricula = p_matricula), 0)
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_passaporte(bigint) from public;
grant execute on function public.get_passaporte(bigint) to anon, authenticated;

-- ┌───────────────────────────────────────────────────────────────────┐
-- │ OPCIONAL: agendar refresh da MV via pg_cron                         │
-- │                                                                     │
-- │ Rodar SEPARADO no SQL Editor (pg_cron precisa estar habilitado no   │
-- │ dashboard do Supabase: Database -> Extensions -> pg_cron).          │
-- │                                                                     │
-- │   select cron.schedule(                                             │
-- │     'refresh-ranking-ano',                                          │
-- │     '15 * * * *',                                                   │
-- │     $$select public.refresh_mv_ranking_ano()$$                      │
-- │   );                                                                │
-- │                                                                     │
-- │ Isso atualiza o ranking 1x por hora. Se preferir manual, basta      │
-- │ chamar: select public.refresh_mv_ranking_ano();                     │
-- └───────────────────────────────────────────────────────────────────┘
