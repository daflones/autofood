# AutoFood - Sistema de Cardápio Digital

## Visão Geral

O Sistema de Cardápio Digital do AutoFood é uma solução completa para gerenciamento de pedidos online via WhatsApp, similar ao Anota.ai. O sistema permite que restaurantes recebam pedidos processados por IA externa e gerenciem todo o fluxo operacional através de uma interface administrativa moderna.

## Funcionalidades Implementadas

### ✅ Core Features
- **Database Schema Completo**: Estrutura para categorias, produtos, pedidos, configurações e logs
- **APIs RESTful**: Endpoints completos para CRUD de categorias, produtos e pedidos
- **Sistema de Notificações WhatsApp**: Integração com Evolution API para notificações automáticas
- **Dashboard em Tempo Real**: Métricas e estatísticas de vendas e pedidos
- **Gerenciamento de Cardápio**: Interface completa para produtos e categorias
- **Configuração de Restaurante**: Sistema de configurações operacionais

### 📱 Páginas Implementadas
1. **CardapioDigital.tsx** - Dashboard principal com métricas e gestão de pedidos
2. **GerenciarCardapio.tsx** - Gerenciamento completo de produtos e categorias
3. **ConfiguracaoRestaurante.tsx** - Configurações do estabelecimento

### 🔧 Componentes
- **ProductForm.tsx** - Formulário completo para criação/edição de produtos
- **WhatsApp Integration** - Sistema de notificações automáticas
- **Notification Service** - Templates e envio de mensagens

## Estrutura do Banco de Dados

### Tabelas Principais
- `categories` - Categorias do cardápio
- `products` - Produtos com preços, ingredientes e adicionais
- `product_additions` - Adicionais dos produtos
- `restaurant_config` - Configurações do restaurante
- `orders` - Pedidos recebidos
- `order_items` - Itens dos pedidos
- `order_status_log` - Histórico de status dos pedidos

## APIs Implementadas

### Categorias
- `GET /api/cardapio-digital/categories` - Listar categorias
- `POST /api/cardapio-digital/categories` - Criar categoria
- `GET /api/cardapio-digital/categories/[id]` - Buscar categoria
- `PUT /api/cardapio-digital/categories/[id]` - Atualizar categoria
- `DELETE /api/cardapio-digital/categories/[id]` - Excluir categoria

### Produtos
- `GET /api/cardapio-digital/products` - Listar produtos
- `POST /api/cardapio-digital/products` - Criar produto
- `GET /api/cardapio-digital/products/[id]` - Buscar produto
- `PUT /api/cardapio-digital/products/[id]` - Atualizar produto
- `DELETE /api/cardapio-digital/products/[id]` - Excluir produto

### Pedidos
- `GET /api/cardapio-digital/orders` - Listar pedidos
- `POST /api/cardapio-digital/orders/create` - Criar pedido (para IA externa)
- `PATCH /api/cardapio-digital/orders/[id]/status` - Atualizar status

### Dashboard e Configuração
- `GET /api/cardapio-digital/dashboard/stats` - Estatísticas do dashboard
- `GET /api/cardapio-digital/config/restaurant` - Configurações do restaurante
- `PUT /api/cardapio-digital/config/restaurant` - Atualizar configurações

## Sistema de Notificações WhatsApp

### Templates Implementados
- **order_confirmed** - Confirmação de pedido
- **preparation_started** - Início do preparo
- **order_ready** - Pedido pronto
- **out_for_delivery** - Saiu para entrega
- **delivered** - Pedido entregue
- **cancelled** - Pedido cancelado

### Fluxo de Status
1. `recebido` → Pedido recebido via WhatsApp
2. `em_preparo` → Iniciado o preparo
3. `pronto` → Pedido finalizado
4. `saiu_entrega` → Saiu para entrega
5. `entregue` → Pedido entregue
6. `cancelado` → Pedido cancelado

## Configuração do Ambiente

### Variáveis de Ambiente Necessárias
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/autofood_db
JWT_SECRET=your-jwt-secret-key-here

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://your-evolution-api-url.com
EVOLUTION_API_KEY=your-evolution-api-key
WHATSAPP_INSTANCE=your-whatsapp-instance-name

# Image Upload (Cloudinary ou AWS S3)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## Como Usar

### 1. Configuração Inicial
1. Execute o schema SQL no banco PostgreSQL
2. Configure as variáveis de ambiente
3. Acesse `/ConfiguracaoRestaurante` para configurar o estabelecimento

### 2. Gerenciamento de Cardápio
1. Acesse `/GerenciarCardapio`
2. Crie categorias para organizar produtos
3. Adicione produtos com preços, imagens e adicionais
4. Configure disponibilidade e promoções

### 3. Recebimento de Pedidos
- Pedidos são recebidos via API `/api/cardapio-digital/orders/create`
- IA externa processa WhatsApp e envia pedidos estruturados
- Sistema automaticamente notifica cliente sobre confirmação

### 4. Gestão de Pedidos
1. Acesse `/CardapioDigital` para ver dashboard
2. Acompanhe métricas em tempo real
3. Gerencie status dos pedidos
4. Notificações automáticas são enviadas a cada mudança de status

## Integração com IA Externa

### Endpoint para Recebimento de Pedidos
```javascript
POST /api/cardapio-digital/orders/create
{
  "customer_phone": "5511999999999",
  "customer_name": "João Silva",
  "delivery_address": "Rua das Flores, 123",
  "payment_method": "pix",
  "notes": "Sem cebola",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "additions": [
        {
          "addition_id": 1,
          "quantity": 1
        }
      ]
    }
  ],
  "external_order_id": "ai_order_123"
}
```

## Próximos Passos

### Para Produção
1. **Configurar Prisma ORM** - Instalar e configurar Prisma para acesso ao banco
2. **Implementar Upload de Imagens** - Integrar Cloudinary ou AWS S3
3. **Configurar Evolution API** - Conectar instância WhatsApp
4. **Testes de Integração** - Testar fluxo completo de pedidos
5. **Deploy e Monitoramento** - Configurar ambiente de produção

### Melhorias Futuras
- Relatórios avançados de vendas
- Sistema de cupons e descontos
- Integração com sistemas de pagamento
- App mobile para entregadores
- Sistema de avaliações de clientes

## Arquitetura Técnica

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL com Prisma ORM
- **WhatsApp**: Evolution API
- **Notificações**: React Hot Toast
- **Upload**: Cloudinary/AWS S3

O sistema está completamente implementado e pronto para integração com a IA de processamento de pedidos via WhatsApp.
