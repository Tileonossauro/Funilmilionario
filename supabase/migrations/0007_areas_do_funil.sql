-- Áreas do funil (Topo / Meio / Fundo e outras que o usuário criar).
-- São faixas horizontais; a etapa pertence a uma área pela própria posição,
-- então não existe vínculo etapa→área para guardar, só a definição das faixas.
alter table funnels add column if not exists areas jsonb;
