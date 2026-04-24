-- RPCs publicas pra permitir a rota /buscar (sem login) consultar o acervo
-- sem depender de RLS permissivo em acervo/livros_exemplares. Mesmo padrao
-- da get_passaporte: security definer + grants anon/authenticated + retorno
-- restrito aos campos que podemos expor publicamente.

-- Busca titulos por titulo/autor (ilike) + contagem de exemplares e
-- disponiveis. Retorna ate `p_limite` resultados ordenados por titulo.
create or replace function public.buscar_acervo(p_termo text, p_limite int default 40)
returns table (
  id uuid,
  titulo text,
  autor text,
  genero text,
  tipo text,
  categoria text,
  descricao text,
  imagem_url text,
  total_exemplares bigint,
  disponiveis bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with t as (
    select nullif(btrim(p_termo), '') as termo
  ),
  candidatos as (
    select a.*
    from acervo a, t
    where t.termo is not null
      and length(t.termo) >= 2
      and (
        a.titulo ilike '%' || t.termo || '%'
        or a.autor  ilike '%' || t.termo || '%'
      )
    order by a.titulo
    limit greatest(coalesce(p_limite, 40), 1)
  ),
  exemp as (
    select
      le.acervo_id,
      count(*) as total,
      count(*) filter (where le.disponivel) as disponiveis
    from livros_exemplares le
    where le.acervo_id in (select c.id from candidatos c)
    group by le.acervo_id
  )
  select
    c.id,
    c.titulo,
    c.autor,
    c.genero,
    c.tipo,
    c.categoria,
    c.descricao,
    c.imagem_url,
    coalesce(e.total, 0) as total_exemplares,
    coalesce(e.disponiveis, 0) as disponiveis
  from candidatos c
  left join exemp e on e.acervo_id = c.id;
$$;

grant execute on function public.buscar_acervo(text, int) to anon, authenticated;

-- Detalhe publico de um titulo + exemplares (so campos nao-sensiveis).
-- Nao retorna quem esta com o livro emprestado.
create or replace function public.detalhe_acervo(p_id uuid)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_livro json;
  v_exemplares json;
begin
  select to_jsonb(x) into v_livro
  from (
    select
      a.id,
      a.titulo,
      a.autor,
      a.editora,
      a.genero,
      a.categoria,
      a.tipo,
      a.cdd,
      a.serie,
      a.descricao,
      a.imagem_url
    from acervo a
    where a.id = p_id
  ) x;

  if v_livro is null then
    return null;
  end if;

  select coalesce(
    json_agg(
      json_build_object(
        'id', le.id,
        'tombo', le.tombo,
        'volume', le.volume,
        'edicao', le.edicao,
        'disponivel', le.disponivel
      ) order by le.tombo nulls last
    ),
    '[]'::json
  )
  into v_exemplares
  from livros_exemplares le
  where le.acervo_id = p_id;

  return json_build_object('livro', v_livro, 'exemplares', v_exemplares);
end;
$$;

grant execute on function public.detalhe_acervo(uuid) to anon, authenticated;

-- Limpeza de versoes anteriores se houver sido criada com assinatura diferente
drop function if exists public.buscar_acervo(text);
