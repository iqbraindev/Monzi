CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'general_assistant',
  description TEXT,
  avatar JSONB NOT NULL DEFAULT '{
    "style": "lottie",
    "asset_id": "avatar-01",
    "primary_color": "#6366f1",
    "background_color": "#1e1b4b"
  }',
  personality JSONB NOT NULL DEFAULT '{
    "preset": "friendly",
    "tone": "warm and helpful",
    "language": "en",
    "response_style": "conversational"
  }',
  voice JSONB NOT NULL DEFAULT '{
    "provider": "openai",
    "voice_id": "alloy",
    "speed": 1.0,
    "enabled": false
  }',
  tools JSONB NOT NULL DEFAULT '{
    "composio_apps": [],
    "dashboard_control": true,
    "web_search": true,
    "file_access": false,
    "calculator": true
  }',
  memory_config JSONB NOT NULL DEFAULT '{
    "max_short_term_messages": 20,
    "long_term_enabled": true,
    "memory_scope": "agent"
  }',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_agents_user ON agents(user_id);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_agent ON conversations(agent_id);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  source_conversation_id UUID REFERENCES conversations(id),
  importance FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memories_embedding ON agent_memories
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_memories_user_agent ON agent_memories(user_id, agent_id);

CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_user_id TEXT,
  match_agent_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id UUID, content TEXT, similarity FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT id, content, 1 - (embedding <=> query_embedding) as similarity
  FROM agent_memories
  WHERE user_id = match_user_id
    AND agent_id = match_agent_id
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
