-- WhatsApp Chat Database Schema
-- Tables for storing chat contacts and messages from Evolution API webhook

-- Chat contacts table
CREATE TABLE IF NOT EXISTS chat_contacts (
  id SERIAL PRIMARY KEY,
  remote_jid VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  push_name VARCHAR(255),
  profile_picture TEXT,
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_contacts_remote_jid ON chat_contacts(remote_jid);
CREATE INDEX IF NOT EXISTS idx_chat_contacts_phone ON chat_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_chat_messages_contact_id ON chat_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_remote_jid ON chat_messages(remote_jid);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_id ON chat_messages(message_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_chat_contacts_updated_at 
    BEFORE UPDATE ON chat_contacts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies if needed
-- ALTER TABLE chat_contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Example policies (uncomment if using RLS)
-- CREATE POLICY "Enable read access for all users" ON chat_contacts FOR SELECT USING (true);
-- CREATE POLICY "Enable insert for all users" ON chat_contacts FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update for all users" ON chat_contacts FOR UPDATE USING (true);
-- CREATE POLICY "Enable delete for all users" ON chat_contacts FOR DELETE USING (true);

-- CREATE POLICY "Enable read access for all users" ON chat_messages FOR SELECT USING (true);
-- CREATE POLICY "Enable insert for all users" ON chat_messages FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update for all users" ON chat_messages FOR UPDATE USING (true);
-- CREATE POLICY "Enable delete for all users" ON chat_messages FOR DELETE USING (true);
