import { supabaseMain } from './supabase';
import type { ChatContact, ChatMessage } from './supabase';

// Evolution API webhook data structure
export interface EvolutionWebhookData {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
      imageMessage?: {
        caption?: string;
      };
      videoMessage?: {
        caption?: string;
      };
      documentMessage?: {
        caption?: string;
      };
    };
    messageType: string;
    messageTimestamp: number;
    status?: string;
    fromMe: boolean;
  };
}

// Format phone number from remoteJid
export const formatPhoneFromRemoteJid = (remoteJid: string): string => {
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
export const extractMessageText = (message: any): string => {
  if (!message) return '';
  
  return message.conversation ||
         message.extendedTextMessage?.text ||
         message.imageMessage?.caption ||
         message.videoMessage?.caption ||
         message.documentMessage?.caption ||
         'Mídia';
};

// Save or update contact in database
export const saveContact = async (webhookData: EvolutionWebhookData): Promise<ChatContact | null> => {
  try {
    const { remoteJid } = webhookData.data.key;
    const pushName = webhookData.data.pushName || 'Contato';
    const phone = formatPhoneFromRemoteJid(remoteJid);
    const isGroup = remoteJid.includes('@g.us');
    
    // Check if contact exists
    const { data: existingContact, error: selectError } = await supabaseMain
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
        const { data: updatedContact, error: updateError } = await supabaseMain
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
      const { data: newContact, error: insertError } = await supabaseMain
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
export const saveMessage = async (
  webhookData: EvolutionWebhookData,
  contact: ChatContact
): Promise<ChatMessage | null> => {
  try {
    const { key, message, messageType, messageTimestamp, status, fromMe } = webhookData.data;
    const messageText = extractMessageText(message);
    
    // Check if message already exists
    const { data: existingMessage, error: selectError } = await supabaseMain
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
    const { data: newMessage, error: insertError } = await supabaseMain
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

// Main webhook handler function
export const processWebhookData = async (webhookData: EvolutionWebhookData): Promise<{
  contact: ChatContact | null;
  message: ChatMessage | null;
}> => {
  try {
    console.log('Processing webhook data:', webhookData);
    
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

// Get chat messages from database
export const getChatMessages = async (remoteJid: string): Promise<ChatMessage[]> => {
  try {
    const { data: messages, error } = await supabaseMain
      .from('chat_messages')
      .select(`
        *,
        contact:chat_contacts(*)
      `)
      .eq('remote_jid', remoteJid)
      .order('timestamp', { ascending: true });
    
    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
    
    return messages || [];
  } catch (error) {
    console.error('Error in getChatMessages:', error);
    return [];
  }
};

// Get all chat contacts with last message
export const getChatContacts = async (): Promise<(ChatContact & { lastMessage?: ChatMessage })[]> => {
  try {
    const { data: contacts, error } = await supabaseMain
      .from('chat_contacts')
      .select(`
        *,
        chat_messages(*)
      `)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
    
    // Add last message to each contact
    const contactsWithLastMessage = contacts?.map(contact => {
      const messages = contact.chat_messages || [];
      const lastMessage = messages.length > 0 
        ? messages.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
        : undefined;
      
      return {
        ...contact,
        lastMessage,
        chat_messages: undefined // Remove to clean up response
      };
    }) || [];
    
    return contactsWithLastMessage;
  } catch (error) {
    console.error('Error in getChatContacts:', error);
    return [];
  }
};
