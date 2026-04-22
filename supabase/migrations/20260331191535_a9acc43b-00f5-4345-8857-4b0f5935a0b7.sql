-- First delete ALL old-format permanent tasks that are not part of the new GESTOR routine
DELETE FROM my_day_items
WHERE date = '2026-03-31'
  AND source = 'PERMANENT'
  AND title NOT IN (
    'Ativar grupos – Ver e responder mensagens',
    'Conferir grupo de clientes – Ver status geral / Identificar problemas',
    'Otimizar campanhas – Ajustar anúncios / Pausar o que não performa',
    'Atualizar sistema/planilha – Atualizar status / Registrar ações'
  );

-- Now delete duplicates of the 4 correct tasks, keeping only the oldest one per user+title
DELETE FROM my_day_items
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, title) id
  FROM my_day_items
  WHERE date = '2026-03-31'
    AND source = 'PERMANENT'
    AND title IN (
      'Ativar grupos – Ver e responder mensagens',
      'Conferir grupo de clientes – Ver status geral / Identificar problemas',
      'Otimizar campanhas – Ajustar anúncios / Pausar o que não performa',
      'Atualizar sistema/planilha – Atualizar status / Registrar ações'
    )
  ORDER BY user_id, title, created_at ASC
)
AND date = '2026-03-31'
AND source = 'PERMANENT'
AND title IN (
  'Ativar grupos – Ver e responder mensagens',
  'Conferir grupo de clientes – Ver status geral / Identificar problemas',
  'Otimizar campanhas – Ajustar anúncios / Pausar o que não performa',
  'Atualizar sistema/planilha – Atualizar status / Registrar ações'
);