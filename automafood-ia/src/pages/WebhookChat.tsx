import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, Phone, MessageCircle } from 'lucide-react';
import { processWebhookData, getChatMessages, getChatContacts, formatPhoneFromRemoteJid } from '../lib/webhookHandler';
import type { ChatContact, ChatMessage } from '../lib/supabase';

interface Chat {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  isGroup: boolean;
}

interface Message {
  id: string;
  remoteJid: string;
  pushName: string;
  message: string;
  timestamp: number;
  fromMe: boolean;
  phone: string;
}

const WebhookChat: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Environment variables
  const evolutionApiUrl = import.meta.env.VITE_EVOLUTION_API_URL;
  const evolutionApiKey = import.meta.env.VITE_EVOLUTION_API_KEY;
  const whatsappInstance = import.meta.env.VITE_WHATSAPP_INSTANCE;
  const webhookUrl = '/api/webhook';

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial data and start real-time updates
  useEffect(() => {
    loadInitialData();
    startRealTimeUpdates();
  }, []);

  // Load initial chats and messages from database
  const loadInitialData = async () => {
    try {
      console.log('Loading initial chat data from database...');
      const contacts = await getChatContacts();
      
      const chatsData: Chat[] = contacts.map(contact => ({
        id: contact.remote_jid,
        name: contact.push_name || contact.name,
        phone: contact.phone,
        lastMessage: contact.lastMessage?.message_text || 'Sem mensagens',
        lastMessageTime: contact.lastMessage ? new Date(contact.lastMessage.timestamp).getTime() : new Date(contact.created_at).getTime(),
        unreadCount: 0,
        isGroup: contact.is_group
      }));
      
      setChats(chatsData);
      console.log('Loaded chats from database:', chatsData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  // Start real-time updates by polling database
  const startRealTimeUpdates = () => {
    console.log('Starting real-time updates...');
    setIsListening(true);
    
    const interval = setInterval(async () => {
      try {
        await loadInitialData();
        
        // If a chat is selected, refresh its messages
        if (selectedChat) {
          const messages = await getChatMessages(selectedChat.id);
          const formattedMessages = messages.map(msg => ({
            id: msg.id.toString(),
            remoteJid: msg.remote_jid,
            pushName: msg.contact?.push_name || msg.contact?.name || 'Contato',
            message: msg.message_text,
            timestamp: new Date(msg.timestamp).getTime(),
            fromMe: msg.from_me,
            phone: msg.contact?.phone || ''
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error in real-time updates:', error);
      }
    }, 5000); // Check every 5 seconds
    
    return () => {
      clearInterval(interval);
      setIsListening(false);
    };
  };

  // This component now reads from database instead of handling webhooks directly
  // The webhook processing is handled by the webhookHandler.ts functions

  // Initialize chats from stored messages
  const initializeChats = () => {
    const chatMap = new Map<string, Chat>();
    
    allMessages.forEach(msg => {
      const existingChat = chatMap.get(msg.remoteJid);
      
      if (!existingChat || msg.timestamp > existingChat.lastMessageTime) {
        chatMap.set(msg.remoteJid, {
          id: msg.remoteJid,
          name: msg.pushName,
          phone: msg.phone,
          lastMessage: msg.message,
          lastMessageTime: msg.timestamp,
          unreadCount: existingChat ? existingChat.unreadCount : 0,
          isGroup: msg.remoteJid.includes('@g.us')
        });
      }
    });
    
    const chatsArray = Array.from(chatMap.values())
      .sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    
    setChats(chatsArray);
  };
  
  // Update chats when messages change
  useEffect(() => {
    initializeChats();
  }, [allMessages]);

  // Get messages for selected chat from database
  const loadChatMessages = async (chatId: string) => {
    try {
      const messages = await getChatMessages(chatId);
      const formattedMessages = messages.map(msg => ({
        id: msg.id.toString(),
        remoteJid: msg.remote_jid,
        pushName: msg.contact?.push_name || msg.contact?.name || 'Contato',
        message: msg.message_text,
        timestamp: new Date(msg.timestamp).getTime(),
        fromMe: msg.from_me,
        phone: msg.contact?.phone || ''
      }));
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !evolutionApiUrl || !evolutionApiKey || !whatsappInstance) return;

    try {
      console.log('Sending message to:', selectedChat.id);
      
      // Extract phone number from remoteJid (chat ID)
      let phoneNumber = selectedChat.phone;
      
      // If phone is still in remoteJid format, extract it
      if (selectedChat.id.includes('@s.whatsapp.net')) {
        phoneNumber = selectedChat.id.replace('@s.whatsapp.net', '');
      } else if (selectedChat.id.includes('@c.us')) {
        phoneNumber = selectedChat.id.replace('@c.us', '');
      }
      
      // Clean phone number (remove non-digits) but keep original if already clean
      if (phoneNumber.includes('Grupo') || phoneNumber === 'Desconhecido') {
        console.error('Cannot send message to group or unknown contact');
        return;
      }
      
      // Ensure phone number is clean digits only
      phoneNumber = phoneNumber.replace(/\D/g, '');
      
      if (!phoneNumber || phoneNumber.length < 10) {
        console.error('Invalid phone number:', phoneNumber);
        return;
      }
      
      console.log('Cleaned phone number:', phoneNumber);
      
      // Use POST /message/sendText endpoint from documentation
      const endpoint = `${evolutionApiUrl}/message/sendText/${encodeURIComponent(whatsappInstance)}`;
      console.log('Sending message to:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey
        },
        body: JSON.stringify({
          number: phoneNumber,
          text: newMessage
        })
      });

      console.log('Send message response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('Message sent successfully:', responseData);
        
        // Refresh messages after sending
        await loadChatMessages(selectedChat.id);
        setNewMessage('');
      } else {
        const errorText = await response.text();
        console.error('Failed to send message:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Clear message even if API fails
      setNewMessage('');
      console.log('Message send failed, but cleared input');
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter chats based on search
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.phone.includes(searchTerm)
  );

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      loadChatMessages(selectedChat.id);
    }
  }, [selectedChat]);

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    // Mark as read
    setChats(prev => prev.map(c => 
      c.id === chat.id ? { ...c, unreadCount: 0 } : c
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Chat WhatsApp - Webhook</h1>
          <p className="text-gray-600 mt-2">
            Mensagens recebidas via webhook • 
            <span className={`ml-2 ${isListening ? 'text-green-600' : 'text-red-600'}`}>
              {isListening ? '🟢 Escutando' : '🔴 Desconectado'}
            </span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '70vh' }}>
          <div className="flex h-full">
            {/* Contacts Sidebar */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar conversas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Chats List */}
              <div className="flex-1 overflow-y-auto">
                {filteredChats.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="text-4xl mb-2">📱</div>
                    <p>Aguardando mensagens...</p>
                    <p className="text-sm">As conversas aparecerão aqui</p>
                  </div>
                ) : (
                  filteredChats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => handleChatSelect(chat)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedChat?.id === chat.id ? 'bg-indigo-50 border-indigo-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                            {chat.isGroup ? '👥' : '👤'}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {chat.name}
                            </p>
                            {chat.lastMessageTime && (
                              <p className="text-xs text-gray-500">
                                {formatTime(chat.lastMessageTime)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 truncate">
                              {chat.lastMessage || 'Sem mensagens'}
                            </p>
                            {chat.unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-600 text-white">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {!selectedChat ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      Bem-vindo ao Chat Webhook
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Selecione uma conversa para começar
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                      <h4 className="font-semibold text-blue-800 mb-2">📞 Reservas pelo WhatsApp</h4>
                      <p className="text-blue-700 text-sm mb-2">
                        As reservas são feitas exclusivamente pelo WhatsApp oficial:
                      </p>
                      <a 
                        href="https://wa.me/5522999866353" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <span className="mr-2">📱</span>
                        (22) 99986-6353
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {selectedChat.isGroup ? '👥' : selectedChat.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedChat.name}</h3>
                        <p className="text-sm text-gray-500">{selectedChat.phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500">
                          <div className="text-4xl mb-2">💬</div>
                          <p>Nenhuma mensagem ainda</p>
                          <p className="text-sm">Comece uma conversa!</p>
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${
                            message.fromMe ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                          }`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              message.fromMe 
                                ? 'bg-indigo-500 text-white' 
                                : 'bg-gray-400 text-white'
                            }`}>
                              {message.fromMe ? 'EU' : selectedChat.name.charAt(0).toUpperCase()}
                            </div>
                            
                            {/* Message Bubble */}
                            <div className="flex flex-col">
                              <div
                                className={`px-4 py-2 rounded-2xl shadow-sm ${
                                  message.fromMe
                                    ? 'bg-indigo-600 text-white rounded-br-md'
                                    : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                                }`}
                              >
                                <p className="text-sm leading-relaxed">{message.message}</p>
                                
                                {/* Message time */}
                                <div className={`flex items-center justify-end mt-1 space-x-1 ${
                                  message.fromMe ? 'text-indigo-200' : 'text-gray-400'
                                }`}>
                                  <span className="text-xs">
                                    {formatTime(message.timestamp)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-end space-x-3">
                      <div className="flex-1">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder="Digite sua mensagem..."
                          rows={1}
                          className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                          style={{ minHeight: '44px', maxHeight: '120px' }}
                        />
                      </div>
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="w-11 h-11 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                        title="Enviar mensagem"
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Pressione Enter para enviar, Shift+Enter para nova linha
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhookChat;
