-- Per-agent monthly token budget ("energy credits") and plan-level caps
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS energy_limit_monthly BIGINT NOT NULL DEFAULT 50000;

ALTER TABLE pack_limits
  ADD COLUMN IF NOT EXISTS agent_energy_default BIGINT NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS agent_energy_max BIGINT NOT NULL DEFAULT 200000;

UPDATE pack_limits pl
SET
  agent_energy_default = v.default_energy,
  agent_energy_max = v.max_energy
FROM (
  VALUES
    ('free', 25000::bigint, 50000::bigint),
    ('starter', 100000::bigint, 500000::bigint),
    ('pro', 500000::bigint, 2000000::bigint),
    ('business', -1::bigint, -1::bigint)
) AS v(slug, default_energy, max_energy)
JOIN packs p ON p.slug = v.slug
WHERE pl.pack_id = p.id;
