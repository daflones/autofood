# AutomaFood Webhook Server

Servidor webhook para receber mensagens do Evolution API e armazenar no Supabase.

## 🚀 Instalação

```bash
cd webhook-server
npm install
```

## ⚙️ Configuração

1. Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

2. Configure as variáveis no `.env`:
```env
PORT=3001
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima_supabase
```

## 🏃 Executar

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

## 📡 Endpoints

### Webhook Principal
```
POST /webhook/evolution
```
Recebe dados do Evolution API e processa mensagens.

### Health Check
```
GET /health
```
Verifica se o servidor está funcionando.

### Webhook Genérico
```
POST /webhook
```
Endpoint de fallback para testes.

## 🔧 Configuração no Evolution API

Configure o webhook no Evolution API apontando para:
```
http://seu-servidor:3001/webhook/evolution
```

## 📊 Estrutura de Dados

O webhook processa eventos do tipo:
- `messages.upsert`
- `message.create` 
- `message`

### Exemplo de payload:
```json
{
  "event": "messages.upsert",
  "instance": "sua_instancia",
  "data": {
    "key": {
      "remoteJid": "5521999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "message_id"
    },
    "pushName": "João Silva",
    "message": {
      "conversation": "Olá! Como posso ajudar?"
    },
    "messageType": "text",
    "messageTimestamp": 1692123456,
    "fromMe": false
  }
}
```

## 🗄️ Banco de Dados

O servidor salva automaticamente:

### Contatos (`chat_contacts`)
- `remote_jid`: ID único do WhatsApp
- `phone`: Telefone formatado
- `name`: Nome do contato
- `push_name`: Nome do perfil

### Mensagens (`chat_messages`)
- `message_id`: ID único da mensagem
- `contact_id`: Referência ao contato
- `message_text`: Texto da mensagem
- `from_me`: Se foi enviada por você
- `timestamp`: Data/hora da mensagem

## 🔍 Logs

O servidor registra:
- ✅ Webhooks recebidos
- 💾 Contatos salvos/atualizados
- 📝 Mensagens processadas
- ❌ Erros de processamento

## 🌐 Deploy

Para produção, configure:
1. Variáveis de ambiente
2. Proxy reverso (nginx)
3. SSL/HTTPS
4. PM2 ou similar para gerenciamento

Exemplo com PM2:
```bash
npm install -g pm2
pm2 start server.js --name "automafood-webhook"
```
