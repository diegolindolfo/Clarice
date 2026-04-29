-- ┌───────────────────────────────────────────────────────────────────┐
-- │ Agendamento do refresh do ranking anual                             │
-- │                                                                     │
-- │ Habilita pg_cron e agenda public.refresh_mv_ranking_ano() para      │
-- │ rodar de hora em hora (no minuto 15). Idempotente: pode ser         │
-- │ executado mais de uma vez sem duplicar o job.                       │
-- │                                                                     │
-- │ pré-requisito: pg_cron precisa estar disponível no projeto. No      │
-- │ Supabase Cloud: Database → Extensions → pg_cron (Enable).           │
-- │ Em self-hosted, garanta `shared_preload_libraries='pg_cron'` e o    │
-- │ banco `cron.database_name` configurado.                             │
-- └───────────────────────────────────────────────────────────────────┘

create extension if not exists pg_cron;

do $$
declare
  v_jobid integer;
begin
  -- pg_cron pode não estar disponível em ambientes locais; nesse caso o
  -- create extension acima já teria falhado, então chegamos aqui apenas
  -- quando cron.job existe.
  select jobid into v_jobid
  from cron.job
  where jobname = 'refresh-ranking-ano';

  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;

  perform cron.schedule(
    'refresh-ranking-ano',
    '15 * * * *',
    $cron$select public.refresh_mv_ranking_ano()$cron$
  );
exception
  when undefined_table then
    raise notice 'pg_cron não está habilitado neste banco — pulei o agendamento.';
  when undefined_function then
    raise notice 'cron.schedule não disponível — pulei o agendamento.';
end $$;
