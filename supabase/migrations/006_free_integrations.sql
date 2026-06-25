-- Free plan: allow 3 integrations so users can try calendar + email + one more app.
UPDATE pack_limits
SET max_integrations = 3
WHERE pack_id = (SELECT id FROM packs WHERE slug = 'free');
