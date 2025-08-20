# 🚀 Deployment Guide - EasyPanel/Vercel

## 📋 Configuração para Produção

### **1. Webhook Endpoint**
```
URL: https://autofood.com.br/api/webhook
Método: POST
```

### **2. Configurar no Evolution API**
```
Webhook URL: https://autofood.com.br/api/webhook
Eventos: messages.upsert, message.create, message
```

### **3. Variáveis de Ambiente (.env)**
```env
# Supabase
VITE_SUPABASE_URL=https://qmtkgibhdljgqmvtamxz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Evolution API
VITE_EVOLUTION_API_URL=https://evolutionapi.agenciagvcompany.com.br
VITE_EVOLUTION_API_KEY=sua_api_key
VITE_WHATSAPP_INSTANCE=Gv Company

# Produção
NODE_ENV=production
DOMAIN=autofood.com.br
```

## 🏗️ Estrutura de Deploy

### **Frontend (Vite)**
- Build: `npm run build`
- Output: `dist/`
- Servido estaticamente

### **API Routes**
- Webhook: `/api/webhook.js`
- Serverless function
- Processa mensagens Evolution API

## 📁 Arquivos Criados

### **1. `/api/webhook.js`**
- Serverless function para webhook
- Processa mensagens do Evolution API
- Salva no Supabase automaticamente

### **2. `/vercel.json`**
- Configuração de deploy
- Rewrites para API routes
- Headers CORS

### **3. `vite.config.ts`**
- Configuração otimizada
- Proxy para desenvolvimento
- Build otimizado para produção

## 🗄️ Banco de Dados

Execute no Supabase SQL Editor:

```sql
-- Chat contacts table
CREATE TABLE IF NOT EXISTS chat_contacts (
  id SERIAL PRIMARY KEY,
  remote_jid VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  push_name VARCHAR(255),
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES chat_contacts(id) ON DELETE CASCADE,
  message_id VARCHAR(255) UNIQUE NOT NULL,
  remote_jid VARCHAR(255) NOT NULL,
  message_text TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  from_me BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20),
  instance_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_contacts_remote_jid ON chat_contacts(remote_jid);
CREATE INDEX IF NOT EXISTS idx_chat_messages_contact_id ON chat_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
```

## 🚀 Deploy Steps

### **EasyPanel**
1. Conectar repositório Git
2. Configurar variáveis de ambiente
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy automático

### **Vercel (Alternativa)**
1. `vercel --prod`
2. Configurar domínio customizado
3. Variáveis de ambiente no dashboard

## 🔧 Configuração Evolution API

```json
{
  "webhook": {
    "url": "https://autofood.com.br/api/webhook",
    "events": [
      "messages.upsert",
      "message.create"
    ],
    "webhook_by_events": true
  }
}
```

## 🧪 Testes

### **Health Check**
```bash
curl https://autofood.com.br/api/webhook
```

### **Webhook Test**
```bash
curl -X POST https://autofood.com.br/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","data":{"key":{"remoteJid":"test"}}}'
```

## 📊 Monitoramento

- Logs: Console do EasyPanel/Vercel
- Banco: Supabase Dashboard
- Webhook: Evolution API logs
- Interface: https://autofood.com.br/chat

## 🔄 Fluxo Completo

1. **Mensagem** → WhatsApp
2. **Evolution API** → Webhook para `autofood.com.br/api/webhook`
3. **API Route** → Processa e salva no Supabase
4. **Interface** → Lê dados do Supabase (polling 5s)
5. **Resposta** → Enviada via Evolution API sendText
