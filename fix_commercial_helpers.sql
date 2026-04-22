create or replace function public.commercial_yes_no(value text)
returns text
language sql
immutable
as $$
  select case upper(coalesce(trim(value), ''))
    when 'SIM' then 'SIM'
    else 'NAO'
  end;
$$;

create or replace function public.commercial_pipeline_faturamento_to_agendamento(faturamento_value text)
returns text
language sql
immutable
as $$
  select case coalesce(faturamento_value, 'NAO_INFORMADO')
    when '0_A_10K' then '0_A_15K'
    when '10K_A_20K' then '15K_A_30K'
    when '20K_A_30K' then '30K_A_50K'
    when '30K_A_50K' then '30K_A_50K'
    when '50K_A_80K' then '50K_A_100K'
    when '80K_A_100K' then '50K_A_100K'
    when '100K_A_150K' then '100K_PLUS'
    when '150K_A_250K' then '100K_PLUS'
    when '250K_A_400K' then '100K_PLUS'
    when '400K_A_600K' then '100K_PLUS'
    when '600K_A_1M' then '100K_PLUS'
    when '1M_PLUS' then '100K_PLUS'
    when '0_A_15K' then '0_A_15K'
    when '15K_A_30K' then '15K_A_30K'
    when '50K_A_100K' then '50K_A_100K'
    when '100K_PLUS' then '100K_PLUS'
    else '0_A_15K'
  end;
$$;
