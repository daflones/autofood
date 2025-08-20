-- AutoFood Digital Menu System Database Schema
-- Complete schema for managing digital menu and orders

-- Categorias do cardápio
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    order_position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Produtos
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(500),
    portion_info VARCHAR(100),
    preparation_time INTEGER DEFAULT 30,
    calories INTEGER,
    is_available BOOLEAN DEFAULT true,
    is_promotion BOOLEAN DEFAULT false,
    promotion_price DECIMAL(10,2),
    ingredients TEXT[],
    allergens TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionais dos produtos
CREATE TABLE product_additions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    max_quantity INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

-- Configurações do restaurante
CREATE TABLE restaurant_config (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    min_order_value DECIMAL(10,2) DEFAULT 0,
    max_delivery_distance INTEGER DEFAULT 10,
    is_open BOOLEAN DEFAULT true,
    opening_hours JSONB DEFAULT '{"monday":{"open":"08:00","close":"22:00","closed":false},"tuesday":{"open":"08:00","close":"22:00","closed":false},"wednesday":{"open":"08:00","close":"22:00","closed":false},"thursday":{"open":"08:00","close":"22:00","closed":false},"friday":{"open":"08:00","close":"22:00","closed":false},"saturday":{"open":"08:00","close":"22:00","closed":false},"sunday":{"open":"08:00","close":"22:00","closed":false}}',
    payment_methods JSONB DEFAULT '["dinheiro","pix","cartao"]',
    whatsapp_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pedidos
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(150),
    status VARCHAR(50) DEFAULT 'recebido',
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_address TEXT,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(50),
    notes TEXT,
    estimated_delivery INTEGER DEFAULT 30,
    external_order_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Itens do pedido
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    additions JSONB DEFAULT '[]',
    total_price DECIMAL(10,2) NOT NULL
);

-- Log de status dos pedidos
CREATE TABLE order_status_log (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    notified_customer BOOLEAN DEFAULT false
);

-- Índices para performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_available ON products(is_available);

-- Inserir configuração inicial do restaurante
INSERT INTO restaurant_config (name, phone, address, whatsapp_number) 
VALUES ('AutoFood Restaurant', '(11) 99999-9999', 'Rua Principal, 123 - Centro', '5511999999999');

-- Inserir categorias iniciais
INSERT INTO categories (name, description, order_position) VALUES
('Entradas', 'Pratos para começar bem a refeição', 1),
('Pratos Principais', 'Nossos pratos principais deliciosos', 2),
('Bebidas', 'Bebidas refrescantes e saborosas', 3),
('Sobremesas', 'Doces para finalizar com chave de ouro', 4);

-- Inserir produtos de exemplo
INSERT INTO products (category_id, name, description, price, portion_info, preparation_time, is_available) VALUES
(1, 'Bruschetta Italiana', 'Pão italiano tostado com tomate, manjericão e azeite', 18.90, 'Porção individual', 15, true),
(2, 'Lasanha Bolonhesa', 'Lasanha tradicional com molho bolonhesa e queijo', 32.90, 'Porção generosa', 25, true),
(2, 'Risotto de Camarão', 'Risotto cremoso com camarões frescos', 45.90, 'Porção individual', 30, true),
(3, 'Suco Natural', 'Suco natural da fruta', 8.90, '300ml', 5, true),
(4, 'Tiramisu', 'Sobremesa italiana tradicional', 16.90, 'Porção individual', 5, true);
