# Configuração do Supabase para o Sistema AutoFood

Este guia explica como configurar **dois projetos Supabase separados** para o sistema AutoFood:
- **Banco Principal**: Para reservas, clientes, funcionários, etc.
- **Banco do Cardápio Digital**: Para categorias, produtos, pedidos, etc.

## 1. Criar Projetos no Supabase

### 1.1 Projeto Principal (Reservas e Clientes)
1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Escolha sua organização
5. Preencha:
   - **Name**: AutoFood Main Database
   - **Database Password**: Crie uma senha segura
   - **Region**: Escolha a região mais próxima (ex: South America)
6. Clique em "Create new project"

### 1.2 Projeto do Cardápio Digital
1. Repita o processo acima
2. Preencha:
   - **Name**: AutoFood Digital Menu
   - **Database Password**: Crie uma senha segura (pode ser diferente)
   - **Region**: Mesma região do projeto principal
3. Clique em "Create new project"

## 2. Configurar Variáveis de Ambiente

### 2.1 Coletar Credenciais do Projeto Principal
1. No painel do **projeto principal**, vá em **Settings > API**
2. Copie as seguintes informações:
   - **Project URL**
   - **anon public key**
   - **service_role key** (mantenha em segredo)

### 2.2 Coletar Credenciais do Projeto do Cardápio Digital
1. No painel do **projeto do cardápio digital**, vá em **Settings > API**
2. Copie as seguintes informações:
   - **Project URL**
   - **anon public key**
   - **service_role key** (mantenha em segredo)

### 2.3 Criar Arquivo .env
Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```bash
# Supabase Configuration - Main Database (Reservas, Clientes, etc.)
VITE_SUPABASE_URL=https://your-main-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-main-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-main-supabase-service-role-key

# Supabase Configuration - Digital Menu Database
VITE_SUPABASE_MENU_URL=https://your-menu-project-id.supabase.co
VITE_SUPABASE_MENU_ANON_KEY=your-menu-supabase-anon-key
SUPABASE_MENU_SERVICE_ROLE_KEY=your-menu-supabase-service-role-key

# Digital Menu System Configuration
JWT_SECRET=your-jwt-secret-key-here

# Evolution API (WhatsApp Integration)
EVOLUTION_API_URL=https://your-evolution-api-url.com
EVOLUTION_API_KEY=your-evolution-api-key
WHATSAPP_INSTANCE=your-instance

# Supabase Storage Bucket Names (no projeto do cardápio digital)
SUPABASE_PRODUCT_IMAGES_BUCKET=product-images
SUPABASE_CATEGORY_IMAGES_BUCKET=category-images
```

## 3. Executar Schema do Banco de Dados

### 3.1 Schema do Cardápio Digital
1. No painel do **projeto do cardápio digital**, vá em **SQL Editor**
2. Clique em "New query"
3. Copie todo o conteúdo do arquivo `database/supabase-schema.sql`
4. Cole no editor SQL
5. Clique em "Run" para executar

Isso criará no **banco do cardápio digital**:
- Tabelas: categories, products, product_additions, restaurant_config, orders, order_items, order_status_logs
- Índices para performance
- Triggers para updated_at
- Dados de exemplo
- Políticas de segurança (RLS)

### 3.2 Schema do Projeto Principal
**Nota**: O schema do projeto principal (reservas, clientes, etc.) será configurado posteriormente quando essas funcionalidades forem implementadas.

## 4. Configurar Storage para Imagens

**⚠️ IMPORTANTE**: Configure o storage apenas no **projeto do cardápio digital**.

### 4.1 Criar Buckets

1. No painel do **projeto do cardápio digital**, vá em **Storage**
2. Clique em "Create a new bucket"
3. Crie dois buckets:
   - **Nome**: `product-images`
   - **Public bucket**: ✅ Marcado
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/*`

4. Repita para o segundo bucket:
   - **Nome**: `category-images`
   - **Public bucket**: ✅ Marcado
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/*`

### 4.2 Configurar Políticas de Storage

Execute no SQL Editor do **projeto do cardápio digital**:

```sql
-- Políticas para product-images bucket
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Public Upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Public Update" ON storage.objects 
FOR UPDATE USING (bucket_id = 'product-images');

CREATE POLICY "Public Delete" ON storage.objects 
FOR DELETE USING (bucket_id = 'product-images');

-- Políticas para category-images bucket
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'category-images');

CREATE POLICY "Public Upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "Public Update" ON storage.objects 
FOR UPDATE USING (bucket_id = 'category-images');

CREATE POLICY "Public Delete" ON storage.objects 
FOR DELETE USING (bucket_id = 'category-images');
```

## 5. Configurar Autenticação (Opcional)

Se quiser adicionar autenticação:

1. Vá em **Authentication > Settings**
2. Configure os provedores desejados
3. Ajuste as políticas RLS conforme necessário

## 6. Testar a Conexão

1. Instale as dependências:
```bash
npm install
```

2. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

3. Acesse `http://localhost:5173`
4. Navegue para as páginas do Cardápio Digital:
   - **Cardápio Digital**: Dashboard com pedidos
   - **Gerenciar Cardápio**: Categorias e produtos
   - **Config. Restaurante**: Configurações

## 7. Funcionalidades Disponíveis

### 7.1 Cardápio Digital (Dashboard)
- ✅ Visualização de estatísticas em tempo real
- ✅ Lista de pedidos com filtros
- ✅ Atualização de status dos pedidos
- ✅ Busca por cliente/telefone/número do pedido

### 7.2 Gerenciar Cardápio
- ✅ Listagem de categorias e produtos
- ✅ Criação de novas categorias
- ✅ Ativação/desativação de produtos
- ✅ Exclusão de produtos
- ✅ Filtros por categoria
- ✅ Busca por nome/descrição

### 7.3 Configuração do Restaurante
- ✅ Informações básicas do restaurante
- ✅ Configurações de entrega
- ✅ Horários de funcionamento
- ✅ Métodos de pagamento
- ✅ Integração WhatsApp

## 8. Próximos Passos

Para completar a implementação:

1. **Upload de Imagens**: Implementar upload real de imagens nos formulários
2. **Formulário de Produtos**: Criar componente completo para adicionar/editar produtos
3. **Notificações WhatsApp**: Integrar com Evolution API
4. **Relatórios**: Adicionar relatórios de vendas e analytics
5. **API Externa**: Criar endpoints para receber pedidos de sistemas externos

## 9. Estrutura do Banco de Dados

### Tabelas Principais:
- `categories`: Categorias dos produtos
- `products`: Produtos do cardápio
- `product_additions`: Adicionais dos produtos
- `restaurant_config`: Configurações do restaurante
- `orders`: Pedidos
- `order_items`: Itens dos pedidos
- `order_status_logs`: Histórico de status dos pedidos

### Storage Buckets:
- `product-images`: Imagens dos produtos
- `category-images`: Imagens das categorias

## 10. Troubleshooting

### Erro de Conexão
- Verifique se as variáveis de ambiente estão corretas
- Confirme se o projeto Supabase está ativo

### Erro de Permissão
- Verifique se as políticas RLS estão configuradas
- Confirme se os buckets de storage são públicos

### Dados Não Aparecem
- Verifique se o schema foi executado corretamente
- Confirme se há dados de exemplo nas tabelas

## 11. Suporte

Para dúvidas ou problemas:
1. Consulte a [documentação oficial do Supabase](https://supabase.com/docs)
2. Verifique os logs no console do navegador
3. Analise os logs no painel do Supabase
