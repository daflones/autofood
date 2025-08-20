// Vercel/EasyPanel API Route for Webhook
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  }
});

// Format phone number from remoteJid
const formatPhoneFromRemoteJid = (remoteJid) => {
  if (remoteJid.includes('@s.whatsapp.net')) {
    const phone = remoteJid.replace('@s.whatsapp.net', '');
    // Format Brazilian phone: 5521999999999 -> (21) 99999-9999
    if (phone.length >= 12 && phone.startsWith('55')) {
      const ddd = phone.substring(2, 4);
      const number = phone.substring(4);
      if (number.length === 9) {
        return `(${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
      } else if (number.length === 8) {
        return `(${ddd}) ${number.substring(0, 4)}-${number.substring(4)}`;
      }
    }
    return phone;
  }
  return remoteJid;
};

// Extract message text from Evolution API message structure
const extractMessageText = (message) => {
  if (!message) return '';
  
  return message.conversation ||
         message.extendedTextMessage?.text ||
         message.imageMessage?.caption ||
         message.videoMessage?.caption ||
         message.documentMessage?.caption ||
         'Mídia';
};

// Save or update contact in database
const saveContact = async (webhookData) => {
  try {
    const { remoteJid } = webhookData.data.key;
    const pushName = webhookData.data.pushName || 'Contato';
    const phone = formatPhoneFromRemoteJid(remoteJid);
    const isGroup = remoteJid.includes('@g.us');
    
    // Check if contact exists
    const { data: existingContact, error: selectError } = await supabase
      .from('chat_contacts')
      .select('*')
      .eq('remote_jid', remoteJid)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing contact:', selectError);
      return null;
    }
    
    if (existingContact) {
      // Update existing contact if name changed
      if (existingContact.push_name !== pushName) {
        const { data: updatedContact, error: updateError } = await supabase
          .from('chat_contacts')
          .update({
            push_name: pushName,
            name: pushName,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingContact.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating contact:', updateError);
          return existingContact;
        }
        
        return updatedContact;
      }
      
      return existingContact;
    } else {
      // Create new contact
      const { data: newContact, error: insertError } = await supabase
        .from('chat_contacts')
        .insert({
          remote_jid: remoteJid,
          phone: phone,
          name: pushName,
          push_name: pushName,
          is_group: isGroup
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating contact:', insertError);
        return null;
      }
      
      return newContact;
    }
  } catch (error) {
    console.error('Error in saveContact:', error);
    return null;
  }
};

// Save message in database
const saveMessage = async (webhookData, contact) => {
  try {
    const { key, message, messageType, messageTimestamp, status, fromMe } = webhookData.data;
    const messageText = extractMessageText(message);
    
    // Check if message already exists
    const { data: existingMessage, error: selectError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('message_id', key.id)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing message:', selectError);
      return null;
    }
    
    if (existingMessage) {
      console.log('Message already exists:', key.id);
      return existingMessage;
    }
    
    // Create new message
    const { data: newMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        contact_id: contact.id,
        message_id: key.id,
        remote_jid: key.remoteJid,
        message_text: messageText,
        message_type: messageType || 'text',
        from_me: fromMe,
        timestamp: new Date(messageTimestamp * 1000).toISOString(),
        status: status || 'received',
        instance_name: webhookData.instance
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating message:', insertError);
      return null;
    }
    
    return newMessage;
  } catch (error) {
    console.error('Error in saveMessage:', error);
    return null;
  }
};

// Process webhook data
const processWebhookData = async (webhookData) => {
  try {
    console.log('Processing webhook data:', JSON.stringify(webhookData, null, 2));
    
    // Save or update contact
    const contact = await saveContact(webhookData);
    if (!contact) {
      console.error('Failed to save contact');
      return { contact: null, message: null };
    }
    
    // Save message
    const message = await saveMessage(webhookData, contact);
    if (!message) {
      console.error('Failed to save message');
      return { contact, message: null };
    }
    
    console.log('Successfully processed webhook data:', {
      contact: contact.name,
      message: message.message_text
    });
    
    return { contact, message };
  } catch (error) {
    console.error('Error processing webhook data:', error);
    return { contact: null, message: null };
  }
};

// Main webhook handler
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'AutomaFood Webhook API',
      domain: 'https://autofood.com.br'
    });
  }
  
  // Process webhook
  if (req.method === 'POST') {
    try {
      console.log('Received webhook:', JSON.stringify(req.body, null, 2));
      
      const webhookData = req.body;
      
      // Validate webhook data structure
      if (!webhookData || !webhookData.data || !webhookData.data.key) {
        console.error('Invalid webhook data structure:', webhookData);
        return res.status(400).json({ 
          error: 'Invalid webhook data structure',
          received: webhookData 
        });
      }
      
      // Process only message events
      if (webhookData.event === 'messages.upsert' || 
          webhookData.event === 'message.create' ||
          webhookData.event === 'message') {
        
        const result = await processWebhookData(webhookData);
        
        if (result.contact && result.message) {
          return res.status(200).json({ 
            success: true, 
            message: 'Webhook processed successfully',
            data: {
              contact: result.contact.name,
              message: result.message.message_text,
              timestamp: result.message.timestamp
            }
          });
        } else {
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to process webhook data' 
          });
        }
      } else {
        // Acknowledge other events but don't process them
        console.log('Ignoring event:', webhookData.event);
        return res.status(200).json({ 
          success: true, 
          message: 'Event acknowledged but not processed',
          event: webhookData.event 
        });
      }
      
    } catch (error) {
      console.error('Error in webhook endpoint:', error);
      return res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  }
  
  // Method not allowed
  return res.status(405).json({ 
    error: 'Method not allowed',
    method: req.method 
  });
}
