-- Digital Menu System Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  portion_info VARCHAR(255),
  preparation_time INTEGER DEFAULT 0,
  calories INTEGER,
  is_available BOOLEAN DEFAULT true,
  is_promotion BOOLEAN DEFAULT false,
  promotion_price DECIMAL(10,2),
  ingredients TEXT[] DEFAULT '{}',
  allergens TEXT[] DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product additions table
CREATE TABLE product_additions (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restaurant configuration table
CREATE TABLE restaurant_config (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_delivery_distance INTEGER DEFAULT 10,
  is_open BOOLEAN DEFAULT true,
  opening_hours JSONB DEFAULT '{}',
  payment_methods TEXT[] DEFAULT '{}',
  whatsapp_number VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_address TEXT,
  delivery_address TEXT,
  status VARCHAR(20) DEFAULT 'recebido' CHECK (status IN ('recebido', 'em_preparo', 'pronto', 'saiu_entrega', 'entregue', 'cancelado')),
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  additions TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order status logs table
CREATE TABLE order_status_logs (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  notified BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_available ON products(is_available);
CREATE INDEX idx_product_additions_product_id ON product_additions(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_status_logs_order_id ON order_status_logs(order_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_additions_updated_at BEFORE UPDATE ON product_additions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_config_updated_at BEFORE UPDATE ON restaurant_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO categories (name, description, display_order) VALUES
('Hambúrgueres', 'Deliciosos hambúrgueres artesanais', 1),
('Pizzas', 'Pizzas tradicionais e especiais', 2),
('Bebidas', 'Refrigerantes, sucos e águas', 3),
('Sobremesas', 'Doces e sobremesas', 4);

INSERT INTO products (category_id, name, description, price, portion_info, preparation_time, calories, ingredients, allergens, display_order) VALUES
(1, 'X-Burger Clássico', 'Hambúrguer com carne, queijo, alface e tomate', 25.90, '200g', 15, 450, '{"Carne bovina", "Queijo", "Alface", "Tomate", "Pão"}', '{"Glúten", "Lactose"}', 1),
(1, 'X-Bacon', 'Hambúrguer com carne, bacon, queijo e molho especial', 29.90, '220g', 18, 520, '{"Carne bovina", "Bacon", "Queijo", "Molho especial", "Pão"}', '{"Glúten", "Lactose"}', 2),
(2, 'Pizza Margherita', 'Pizza com molho de tomate, mussarela e manjericão', 32.50, 'Média (6 fatias)', 25, 280, '{"Massa", "Molho de tomate", "Mussarela", "Manjericão"}', '{"Glúten", "Lactose"}', 1),
(2, 'Pizza Pepperoni', 'Pizza com molho de tomate, mussarela e pepperoni', 38.90, 'Média (6 fatias)', 25, 320, '{"Massa", "Molho de tomate", "Mussarela", "Pepperoni"}', '{"Glúten", "Lactose"}', 2),
(3, 'Coca-Cola 350ml', 'Refrigerante Coca-Cola lata', 4.50, '350ml', 0, 140, '{"Água gaseificada", "Açúcar", "Cafeína"}', '{}', 1),
(3, 'Suco de Laranja', 'Suco natural de laranja', 6.90, '300ml', 2, 110, '{"Laranja natural", "Água"}', '{}', 2),
(4, 'Pudim de Leite', 'Pudim caseiro com calda de caramelo', 8.90, '120g', 0, 180, '{"Leite", "Ovos", "Açúcar", "Caramelo"}', '{"Lactose", "Ovos"}', 1);

INSERT INTO product_additions (product_id, name, price) VALUES
(1, 'Bacon Extra', 3.00),
(1, 'Queijo Extra', 2.50),
(1, 'Cebola Caramelizada', 2.00),
(2, 'Queijo Extra', 2.50),
(2, 'Cebola Caramelizada', 2.00),
(3, 'Borda Recheada', 5.00),
(3, 'Queijo Extra', 3.00),
(4, 'Borda Recheada', 5.00),
(4, 'Queijo Extra', 3.00);

INSERT INTO restaurant_config (name, phone, address, delivery_fee, min_order_value, max_delivery_distance, opening_hours, payment_methods, whatsapp_number) VALUES
('AutoFood Restaurante', '(11) 99999-9999', 'Rua das Flores, 123 - Centro, São Paulo - SP', 5.00, 25.00, 10, 
'{"monday": {"open": "18:00", "close": "23:00", "closed": false}, "tuesday": {"open": "18:00", "close": "23:00", "closed": false}, "wednesday": {"open": "18:00", "close": "23:00", "closed": false}, "thursday": {"open": "18:00", "close": "23:00", "closed": false}, "friday": {"open": "18:00", "close": "00:00", "closed": false}, "saturday": {"open": "18:00", "close": "00:00", "closed": false}, "sunday": {"open": "18:00", "close": "22:00", "closed": false}}',
'{"PIX", "Dinheiro", "Cartão de Débito", "Cartão de Crédito"}', '5511999999999');

-- Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_additions ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access on categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access on products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public read access on product_additions" ON product_additions FOR SELECT USING (true);
CREATE POLICY "Allow public read access on restaurant_config" ON restaurant_config FOR SELECT USING (true);

-- For orders, you might want more restrictive policies
CREATE POLICY "Allow public insert on orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read own orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert on order_items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read order_items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert on order_status_logs" ON order_status_logs FOR INSERT WITH CHECK (true);

-- Create storage buckets (run these in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('category-images', 'category-images', true);

-- Storage policies for buckets
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
-- CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'category-images');
-- CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'category-images');
