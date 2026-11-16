-- ┌───────────────────────────────────────────────────────────────────┐
-- │ Segurança, RLS, Search Path e Índices Complementares              │
-- │                                                                   │
-- │ 1. Garante a RPC pública check_matricula(bigint) no repositório.  │
-- │ 2. Revoga escrita e acesso indevido da role pública `anon` nas    │
-- │    tabelas internas e views administrativas.                      │
-- │ 3. Habilita Row Level Security (RLS) nas 6 tabelas do schema      │
-- │    `public` com policies completas para `authenticated`.          │
-- │ 4. Configura `security_invoker = true` nas 4 views.               │
-- │ 5. Fixa `search_path = public` nas 5 funções apontadas no linter. │
-- │ 6. Cria índices complementares (`idx_acervo_autor_trgm`, etc.).   │
-- └───────────────────────────────────────────────────────────────────┘

-- 1) RPC pública de verificação de matrícula usada em /passaporte
create or replace function public.check_matricula(p_matricula bigint)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'existe', exists(select 1 from public.alunos where matricula = p_matricula),
    'ativo',  coalesce((select ativo from public.alunos where matricula = p_matricula), false)
  );
$$;

revoke all on function public.check_matricula(bigint) from public;
grant execute on function public.check_matricula(bigint) to anon, authenticated;

-- 2) Revogar permissões excessivas da role `anon` em tabelas sensíveis e views internas
revoke all on table
  public.alunos,
  public.emprestimos,
  public.turmas,
  public.exemplares_historico_emprestimos,
  public.vw_acervo_catalogo,
  public.vw_acervo_duplicatas,
  public.vw_emprestimos_atrasados,
  public.vw_painel_aluno
from anon;

revoke insert, update, delete, truncate, references, trigger on table
  public.acervo,
  public.livros_exemplares
from anon;

-- 3) Habilitar RLS em todas as tabelas do schema `public`
alter table public.acervo enable row level security;
alter table public.alunos enable row level security;
alter table public.emprestimos enable row level security;
alter table public.livros_exemplares enable row level security;
alter table public.turmas enable row level security;
alter table public.exemplares_historico_emprestimos enable row level security;

-- Remover policies legadas quebradas (que comparavam matricula::text com auth.uid()::text)
drop policy if exists "aluno_le_proprio_perfil" on public.alunos;
drop policy if exists "aluno_le_proprios_emprestimos" on public.emprestimos;

-- Leitura pública apenas para catálogo e exemplares (fallback de /buscar)
drop policy if exists "acervo_leitura_publica" on public.acervo;
create policy "acervo_leitura_publica"
  on public.acervo
  for select
  to anon, authenticated
  using (true);

drop policy if exists "exemplares_leitura_publica" on public.livros_exemplares;
create policy "exemplares_leitura_publica"
  on public.livros_exemplares
  for select
  to anon, authenticated
  using (true);

-- Policies completas para usuários autenticados (bibliotecária / administração)
drop policy if exists "authenticated_all_acervo" on public.acervo;
create policy "authenticated_all_acervo"
  on public.acervo
  for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "authenticated_all_alunos" on public.alunos;
create policy "authenticated_all_alunos"
  on public.alunos
  for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "authenticated_all_emprestimos" on public.emprestimos;
create policy "authenticated_all_emprestimos"
  on public.emprestimos
  for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "authenticated_all_livros_exemplares" on public.livros_exemplares;
create policy "authenticated_all_livros_exemplares"
  on public.livros_exemplares
  for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "authenticated_all_turmas" on public.turmas;
create policy "authenticated_all_turmas"
  on public.turmas
  for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "authenticated_all_historico_exemplares" on public.exemplares_historico_emprestimos;
create policy "authenticated_all_historico_exemplares"
  on public.exemplares_historico_emprestimos
  for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- 4) Views administrativas com security_invoker = true (respeita RLS do usuário logado)
alter view public.vw_acervo_catalogo set (security_invoker = true);
alter view public.vw_acervo_duplicatas set (security_invoker = true);
alter view public.vw_emprestimos_atrasados set (security_invoker = true);
alter view public.vw_painel_aluno set (security_invoker = true);

-- 5) Fixar search_path nas funções internas do banco
alter function public.devolver_livro(uuid) set search_path = public;
alter function public.mesclar_obras_acervo(uuid, uuid) set search_path = public;
alter function public.renovar_emprestimo(uuid) set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.trg_emprestimo_exemplar() set search_path = public;

-- 6) Índices de performance complementares
create extension if not exists pg_trgm;

create index if not exists idx_acervo_autor_trgm
  on public.acervo using gin (autor gin_trgm_ops);

create index if not exists idx_emprestimos_devolvido_data
  on public.emprestimos (data_devolucao_real)
  where status = 'DEVOLVIDO';
