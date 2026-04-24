-- ┌───────────────────────────────────────────────────────────────────┐
-- │ Bucket publico "capas" + policies                                  │
-- │                                                                    │
-- │ Usado pela curadoria de acervo pra salvar as capas sugeridas       │
-- │ (Open Library / Google Books) no Storage do proprio projeto, em   │
-- │ vez de depender do CDN externo.                                    │
-- │                                                                    │
-- │ Leitura: publica (as capas aparecem em paginas sem login).         │
-- │ Escrita: apenas usuarios autenticados (bibliotecaria).             │
-- └───────────────────────────────────────────────────────────────────┘

insert into storage.buckets (id, name, public)
values ('capas', 'capas', true)
on conflict (id) do update set public = excluded.public;

-- Leitura publica: qualquer um baixa as capas (incluindo rota /passaporte
-- sem login).
drop policy if exists "capas public read" on storage.objects;
create policy "capas public read"
on storage.objects
for select
to public
using (bucket_id = 'capas');

-- Upload/update apenas authenticated (a bibliotecaria).
drop policy if exists "capas authenticated insert" on storage.objects;
create policy "capas authenticated insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'capas');

drop policy if exists "capas authenticated update" on storage.objects;
create policy "capas authenticated update"
on storage.objects
for update
to authenticated
using (bucket_id = 'capas')
with check (bucket_id = 'capas');

drop policy if exists "capas authenticated delete" on storage.objects;
create policy "capas authenticated delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'capas');
