-- Legacy schema defaulted voice.enabled to false with no UI to opt in.
UPDATE agents
SET voice = jsonb_set(voice, '{enabled}', 'true'::jsonb, true);

ALTER TABLE agents
ALTER COLUMN voice SET DEFAULT '{
  "provider": "openai",
  "voice_id": "nova",
  "speed": 1.0,
  "enabled": true
}'::jsonb;
