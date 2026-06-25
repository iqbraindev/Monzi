# 04 — Agent System Specification

---

## 🤖 Agent Data Model

```typescript
interface Agent {
  id: string                          // UUID
  user_id: string                     // Clerk user ID (owner)
  name: string                        // "Nova", "Max", "Alex"
  slug: string                        // "nova" (URL safe)
  role: AgentRole                     // predefined role
  description: string                 // What this agent does
  avatar: AgentAvatar
  personality: AgentPersonality
  voice: AgentVoice
  tools: AgentTools
  memory_config: MemoryConfig
  is_active: boolean
  created_at: string
  updated_at: string
}

type AgentRole =
  | 'general_assistant'
  | 'business_assistant'
  | 'personal_coach'
  | 'finance_advisor'
  | 'project_manager'
  | 'crm_assistant'
  | 'content_creator'
  | 'data_analyst'
  | 'dev_helper'
  | 'custom'

interface AgentAvatar {
  style: 'lottie' | 'illustrated' | 'minimal'
  asset_id: string                    // reference to avatar JSON or image
  primary_color: string               // hex
  background_color: string            // hex
  custom_image_url?: string           // if user uploaded custom avatar
}

interface AgentPersonality {
  preset: 'professional' | 'friendly' | 'analytical' | 'motivating' | 'custom'
  tone: string                        // "concise and direct"
  language: string                    // "en", "fr", "ar"...
  custom_instructions?: string        // extra prompt instructions
  response_style: 'brief' | 'detailed' | 'conversational'
}

interface AgentVoice {
  provider: 'openai' | 'elevenlabs' | 'none'
  voice_id: string                    // provider-specific voice ID
  speed: number                       // 0.5 - 2.0
  enabled: boolean
}

interface AgentTools {
  composio_apps: string[]             // ['gmail', 'notion', 'hubspot']
  dashboard_control: boolean          // can agent create/modify widgets?
  web_search: boolean
  file_access: boolean
  calculator: boolean
}

interface MemoryConfig {
  max_short_term_messages: number     // default: 20
  long_term_enabled: boolean          // pgvector memory
  memory_scope: 'agent' | 'user'     // agent-specific or shared across agents
}
```

---

## 🧠 Memory System

### Two-Layer Memory

```
Short-term (conversation context)
├── Last N messages in context window
├── Stored per conversation in conversations table
└── Auto-truncated when limit reached

Long-term (persistent memory)
├── Key facts extracted from conversations
├── Embedded with text-embedding-3-small
├── Stored in agent_memories (pgvector)
└── Retrieved via similarity search on each new message
```

### Memory Service Implementation

```typescript
// src/lib/langchain/memory.ts

export class MemoryService {

  // Store a new memory after conversation
  async store(userId: string, agentId: string, exchange: {
    userMessage: string
    agentResponse: string
  }) {
    // Extract facts using LLM
    const facts = await this.extractFacts(exchange)

    for (const fact of facts) {
      // Generate embedding
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: fact
      })

      // Store in pgvector
      await supabase.from('agent_memories').insert({
        user_id: userId,
        agent_id: agentId,
        content: fact,
        embedding: embedding.data[0].embedding,
        source_conversation_id: exchange.conversationId
      })
    }
  }

  // Retrieve relevant memories for a new message
  async recall(userId: string, agentId: string, query: string, topK = 5) {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    })

    const { data } = await supabase.rpc('match_memories', {
      query_embedding: embedding.data[0].embedding,
      match_user_id: userId,
      match_agent_id: agentId,
      match_threshold: 0.7,
      match_count: topK
    })

    return data.map(m => m.content)
  }

  // Extract structured facts from a conversation
  private async extractFacts(exchange: any): Promise<string[]> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: 'Extract key facts about the user from this conversation. Return a JSON array of short factual strings. Only extract objective facts worth remembering long-term. Return [] if nothing worth remembering.'
      }, {
        role: 'user',
        content: `User: ${exchange.userMessage}\nAgent: ${exchange.agentResponse}`
      }],
      response_format: { type: 'json_object' }
    })
    const parsed = JSON.parse(response.choices[0].message.content!)
    return parsed.facts || []
  }
}
```

---

## 🎭 Agent Orchestrator

```typescript
// src/lib/langchain/agent.ts

export class AgentOrchestrator {

  async run(params: {
    agentId: string
    userId: string
    message: string
    conversationHistory: Message[]
    streamCallback: (token: string) => void
  }) {
    // 1. Load agent config
    const agent = await agentService.getById(params.agentId)
    const userProfile = await userService.getProfile(params.userId)

    // 2. Recall relevant memories
    const memories = await memoryService.recall(
      params.userId, params.agentId, params.message
    )

    // 3. Build system prompt
    const systemPrompt = buildSystemPrompt({
      agent,
      userProfile,
      memories,
      currentDateTime: new Date().toISOString()
    })

    // 4. Load tools
    const tools = await this.loadTools(agent, params.userId)

    // 5. Run LangChain agent with streaming
    const executor = AgentExecutor.fromAgentAndTools({
      agent: createOpenAIFunctionsAgent({ llm, tools, prompt }),
      tools,
      verbose: process.env.NODE_ENV === 'development'
    })

    // 6. Stream response
    const result = await executor.stream({
      input: params.message,
      chat_history: params.conversationHistory
    })

    // 7. Store memory after response
    await memoryService.store(params.userId, params.agentId, {
      userMessage: params.message,
      agentResponse: result.output,
      conversationId: params.conversationId
    })

    // 8. Track usage
    await usageTracker.increment(params.userId, 'ai_messages')
    await usageTracker.addTokens(params.userId, result.tokenUsage)

    return result
  }

  private async loadTools(agent: Agent, userId: string) {
    const tools = []

    // Always available
    tools.push(...systemTools)           // date, calculator, weather

    // Dashboard tools (if enabled)
    if (agent.tools.dashboard_control) {
      tools.push(...dashboardTools(userId))
    }

    // Web search (if enabled)
    if (agent.tools.web_search) {
      tools.push(webSearchTool)
    }

    // Composio tools (based on connected apps)
    if (agent.tools.composio_apps.length > 0) {
      const composioTools = await composioService.getTools({
        apps: agent.tools.composio_apps,
        userId
      })
      tools.push(...composioTools)
    }

    return tools
  }
}
```

---

## 🎨 Agent Creator Wizard (UI Flow)

```
Step 1: Choose Role
  → Grid of role cards (Business Assistant, Coach, Finance...)
  → Each has description and example tasks

Step 2: Personalize
  → Name input
  → Avatar picker (12 presets, color customizer)
  → Personality preset selector

Step 3: Connect Apps
  → Show relevant Composio apps for the chosen role
  → One-click OAuth connect

Step 4: Preview & Launch
  → Show agent card preview
  → Sample conversation to test
  → "Launch Agent" button
```

---

## 📋 Agent Personality Templates

```typescript
// src/lib/langchain/prompts/personalities.ts

export const PERSONALITIES = {
  professional: {
    tone: 'formal, concise, action-oriented',
    style: 'Use bullet points for lists. Be direct. No filler words.',
    greeting: 'How can I assist you today?'
  },
  friendly: {
    tone: 'warm, encouraging, conversational',
    style: 'Use natural language. Show enthusiasm. Ask follow-up questions.',
    greeting: 'Hey! What are we working on today?'
  },
  analytical: {
    tone: 'precise, data-driven, structured',
    style: 'Present data clearly. Use numbers. Provide reasoning.',
    greeting: 'Ready to analyze. What data should we look at?'
  },
  motivating: {
    tone: 'energetic, positive, supportive',
    style: 'Celebrate wins. Encourage progress. Keep energy high.',
    greeting: 'Let\'s make today count! What are we tackling?'
  }
}
```
