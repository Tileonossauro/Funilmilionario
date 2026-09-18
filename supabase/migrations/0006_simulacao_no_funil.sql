-- Cenário de projeção do funil (entrada, tráfego, investimento, taxas ajustadas).
-- Fica no funil porque é do funil, não do usuário: reabrir o mapa amanhã tem de
-- trazer o cenário de volta.
alter table funnels add column if not exists simulacao jsonb;
