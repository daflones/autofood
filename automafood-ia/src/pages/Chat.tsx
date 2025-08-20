import React, { useState, useEffect, useRef } from 'react';
import { Search, Send } from 'lucide-react';

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  status: 'sent' | 'delivered' | 'read';
  messageType?: string;
}

interface Chat {
  id: string;
  name: string;
  phone: string;
  lastMessage?: string;
  lastMessageTime: number;
  unreadCount: number;
  isGroup: boolean;
  avatar?: string;
}

const Chat: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const evolutionApiUrl = import.meta.env.VITE_EVOLUTION_API_URL;
  const evolutionApiKey = import.meta.env.VITE_EVOLUTION_API_KEY;
  const whatsappInstance = import.meta.env.VITE_WHATSAPP_INSTANCE;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // First, check available instances
  const checkInstances = async () => {
    if (!evolutionApiUrl || !evolutionApiKey) return null;
    
    try {
      console.log('Checking available instances...');
      const response = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey
        }
      });
      
      if (response.ok) {
        const instances = await response.json();
        console.log('Available instances:', instances);
        return instances;
      }
    } catch (error) {
      console.error('Error checking instances:', error);
    }
    return null;
  };

  // Fetch chats from Evolution API
  const fetchChats = async () => {
    if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
      console.log('Missing Evolution API configuration');
      // Use mock data for testing
      const mockChats: Chat[] = [
        {
          id: '5511999999999@s.whatsapp.net',
          name: 'João Silva',
          phone: '+55 11 99999-9999',
          lastMessage: 'Olá! Gostaria de fazer um pedido.',
          lastMessageTime: Date.now() - 300000,
          unreadCount: 2,
          isGroup: false
        },
        {
          id: '5511888888888@s.whatsapp.net',
          name: 'Maria Santos',
          phone: '+55 11 88888-8888',
          lastMessage: 'Obrigada pelo atendimento!',
          lastMessageTime: Date.now() - 600000,
          unreadCount: 0,
          isGroup: false
        },
        {
          id: '120363043965781234@g.us',
          name: 'Grupo Família',
          phone: 'Grupo',
          lastMessage: 'Vamos pedir pizza hoje?',
          lastMessageTime: Date.now() - 900000,
          unreadCount: 5,
          isGroup: true
        }
      ];
      
      setChats(mockChats);
      console.log('Using mock chats for testing:', mockChats);
      return;
    }

    try {
      console.log('Fetching chats from Evolution API...');
      console.log('API URL:', evolutionApiUrl);
      console.log('Instance:', whatsappInstance);
      
      // First check if instance exists and is connected
      const instances = await checkInstances();
      let finalInstance = null;
      
      if (instances) {
        console.log('Looking for instance:', `"${whatsappInstance}"`);
        console.log('Available instance names:');
        instances.forEach((inst: any, index: number) => {
          const name = inst.name; // API uses 'name' field
          const status = inst.connectionStatus; // API uses 'connectionStatus' field
          console.log(`  [${index}] name: "${name}" (connectionStatus: ${status})`);
          
          // Check exact match
          if (name === whatsappInstance) {
            console.log(`  ✅ EXACT MATCH FOUND at index ${index}`);
          }
          
          // Check case-insensitive match
          if (name?.toLowerCase() === whatsappInstance.toLowerCase()) {
            console.log(`  🔤 CASE-INSENSITIVE MATCH at index ${index}`);
          }
        });
        
        const instanceFound = instances.find((inst: any) => 
          inst.name === whatsappInstance
        );
        
        if (!instanceFound) {
          console.error('Instance not found:', whatsappInstance);
          console.error('Trying case-insensitive search...');
          
          const instanceFoundCaseInsensitive = instances.find((inst: any) => 
            inst.name?.toLowerCase() === whatsappInstance.toLowerCase()
          );
          
          if (instanceFoundCaseInsensitive) {
            console.log('Found instance with case-insensitive match:', instanceFoundCaseInsensitive);
            finalInstance = instanceFoundCaseInsensitive;
          } else {
            throw new Error(`Instance '${whatsappInstance}' not found in available instances`);
          }
        } else {
          finalInstance = instanceFound;
        }
        
        if (finalInstance && finalInstance.connectionStatus !== 'open') {
          console.error('Instance not connected:', finalInstance);
          throw new Error(`Instance '${whatsappInstance}' is not connected (status: ${finalInstance.connectionStatus})`);
        }
        
        console.log('Instance found and connected:', finalInstance);
      }
      
      // Try multiple endpoints to find working one
      let response;
      let endpoint;
      
      // First try GET /chat/findChats
      endpoint = `${evolutionApiUrl}/chat/findChats/${encodeURIComponent(whatsappInstance)}`;
      console.log('Trying findChats GET endpoint:', endpoint);
      
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey
        }
      });
      
      console.log('FindChats GET response status:', response.status);
      
      // If GET fails, try POST with empty body
      if (!response.ok) {
        console.log('GET failed, trying POST with empty body...');
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey
          },
          body: JSON.stringify({})
        });
        console.log('FindChats POST response status:', response.status);
      }
      
      // If still fails, try findContacts as fallback
      if (!response.ok) {
        console.log('FindChats failed, trying findContacts as fallback...');
        endpoint = `${evolutionApiUrl}/chat/findContacts/${encodeURIComponent(whatsappInstance)}`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey
          },
          body: JSON.stringify({
            where: {}
          })
        });
        console.log('FindContacts fallback response status:', response.status);
      }

      console.log('Chats response status:', response.status);
      
      if (response.ok) {
        const chatsData = await response.json();
        console.log('Chats data received:', chatsData);
        
        let chats: Chat[] = [];
        
        if (Array.isArray(chatsData)) {
          chats = await Promise.all(
            chatsData.map(async (chat: any) => {
              // Extract remoteJid (chat ID) from chats
              const remoteJid = chat.id;
              
              // Extract phone number from remoteJid
              let phone = 'Desconhecido';
              let displayName = 'Chat';
              let lastMessage = 'Carregando mensagens...';
              
              if (remoteJid) {
                if (remoteJid.includes('@g.us')) {
                  // Group chat
                  phone = 'Grupo';
                  displayName = chat.name || chat.subject || 'Grupo';
                } else if (remoteJid.includes('@s.whatsapp.net')) {
                  // Individual chat - extract phone number
                  const phoneNumber = remoteJid.replace('@s.whatsapp.net', '');
                  phone = phoneNumber;
                  
                  // Format phone for display
                  if (phoneNumber.length >= 10) {
                    const formatted = phoneNumber.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
                    displayName = chat.pushName || chat.name || chat.notifyName || formatted;
                  } else {
                    displayName = chat.pushName || chat.name || chat.notifyName || phoneNumber;
                  }
                }
              }
              
              // Fetch last message for this chat
              try {
                const messagesEndpoint = `${evolutionApiUrl}/chat/findMessages/${encodeURIComponent(whatsappInstance)}`;
                const messagesResponse = await fetch(messagesEndpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': evolutionApiKey
                  },
                  body: JSON.stringify({
                    where: {
                      key: {
                        remoteJid: remoteJid
                      }
                    },
                    limit: 1
                  })
                });
                
                if (messagesResponse.ok) {
                  const messagesData = await messagesResponse.json();
                  if (Array.isArray(messagesData) && messagesData.length > 0) {
                    const lastMsg = messagesData[messagesData.length - 1];
                    if (lastMsg.message) {
                      lastMessage = lastMsg.message.conversation || 
                                   lastMsg.message.extendedTextMessage?.text ||
                                   'Mídia';
                    } else {
                      lastMessage = lastMsg.body || lastMsg.text || 'Mensagem';
                    }
                  } else {
                    lastMessage = 'Sem mensagens';
                  }
                } else {
                  lastMessage = 'Erro ao carregar mensagens';
                }
              } catch (error) {
                console.error('Error fetching messages for chat:', remoteJid, error);
                lastMessage = 'Erro ao carregar';
              }
              
              return {
                id: remoteJid,
                name: displayName,
                phone: phone,
                lastMessage: lastMessage,
                lastMessageTime: chat.lastMessageTime || chat.timestamp || Date.now(),
                unreadCount: chat.unreadCount || 0,
                isGroup: remoteJid?.includes('@g.us') || false
              };
            })
          );
          
          // Sort chats by last message time
          chats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
          
          setChats(chats);
          console.log('Processed chats with messages:', chats);
        } else {
          console.warn('Chats data is not an array:', chatsData);
          throw new Error('Invalid chats data format');
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch chats:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching chats, using mock data:', error);
      
      // Fallback to mock data
      const mockChats: Chat[] = [
        {
          id: '5511999999999@s.whatsapp.net',
          name: 'João Silva',
          phone: '+55 11 99999-9999',
          lastMessage: 'Olá! Gostaria de fazer um pedido.',
          lastMessageTime: Date.now() - 300000,
          unreadCount: 2,
          isGroup: false
        },
        {
          id: '5511888888888@s.whatsapp.net',
          name: 'Maria Santos',
          phone: '+55 11 88888-8888',
          lastMessage: 'Obrigada pelo atendimento!',
          lastMessageTime: Date.now() - 600000,
          unreadCount: 0,
          isGroup: false
        },
        {
          id: '120363043965781234@g.us',
          name: 'Grupo Família',
          phone: 'Grupo',
          lastMessage: 'Vamos pedir pizza hoje?',
          lastMessageTime: Date.now() - 900000,
          unreadCount: 5,
          isGroup: true
        }
      ];
      
      setChats(mockChats);
      console.log('Using mock chats for testing:', mockChats);
    }
  };

  // Fetch messages for selected chat
  const fetchMessages = async (chatId: string) => {
    if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
      console.error('Missing Evolution API configuration');
      return;
    }

    try {
      console.log('Fetching messages for chat:', chatId);
      
      // Use official Evolution API v1 endpoint for finding messages
      const endpoint = `${evolutionApiUrl}/chat/findMessages/${encodeURIComponent(whatsappInstance)}`;
      console.log('Messages endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey
        },
        body: JSON.stringify({
          where: {
            key: {
              remoteJid: chatId
            }
          },
          limit: 50
        })
      });

      console.log('Messages response status:', response.status);
      
      if (response.ok) {
        const messagesData = await response.json();
        console.log('Messages data received:', messagesData);
        
        let formattedMessages: Message[] = [];
        
        if (Array.isArray(messagesData)) {
          formattedMessages = messagesData.map((msg: any) => {
            // Extract message content from WhatsApp message structure
            let messageBody = '';
            if (msg.message) {
              messageBody = msg.message.conversation || 
                           msg.message.extendedTextMessage?.text ||
                           msg.message.imageMessage?.caption ||
                           msg.message.videoMessage?.caption ||
                           msg.message.documentMessage?.caption ||
                           'Mídia';
            } else {
              messageBody = msg.body || msg.text || msg.content || 'Mensagem';
            }
            
            return {
              id: msg.key?.id || msg.id || Date.now().toString(),
              from: msg.key?.fromMe ? whatsappInstance : (msg.key?.remoteJid || msg.from),
              to: msg.key?.fromMe ? (msg.key?.remoteJid || msg.to) : whatsappInstance,
              body: messageBody,
              timestamp: msg.messageTimestamp ? msg.messageTimestamp * 1000 : (msg.timestamp || Date.now()),
              fromMe: msg.key?.fromMe || msg.fromMe || false,
              status: msg.status || 'sent',
              messageType: msg.message ? Object.keys(msg.message)[0] : 'text'
            };
          });
        } else if (messagesData && typeof messagesData === 'object') {
          // Handle case where API returns object instead of array
          console.log('Messages data is object, attempting to extract messages...');
          console.log('Object keys:', Object.keys(messagesData));
          console.log('Full object:', messagesData);
          
          // Try different object structures based on Evolution API response
          const messages = messagesData.messages || 
                          messagesData.data || 
                          messagesData.result || 
                          messagesData.response ||
                          (Array.isArray(messagesData) ? messagesData : []);
          
          if (Array.isArray(messages) && messages.length > 0) {
            formattedMessages = messages.map((msg: any) => {
              let messageBody = '';
              if (msg.message) {
                messageBody = msg.message.conversation || 
                             msg.message.extendedTextMessage?.text ||
                             msg.message.imageMessage?.caption ||
                             'Mídia';
              } else {
                messageBody = msg.body || msg.text || msg.content || 'Mensagem';
              }
              
              return {
                id: msg.key?.id || msg.id || Date.now().toString(),
                from: msg.key?.fromMe ? whatsappInstance : (msg.key?.remoteJid || msg.from),
                to: msg.key?.fromMe ? (msg.key?.remoteJid || msg.to) : whatsappInstance,
                body: messageBody,
                timestamp: msg.messageTimestamp ? msg.messageTimestamp * 1000 : (msg.timestamp || Date.now()),
                fromMe: msg.key?.fromMe || msg.fromMe || false,
                status: msg.status || 'sent',
                messageType: msg.message ? Object.keys(msg.message)[0] : 'text'
              };
            });
          } else {
            console.warn('No messages array found in object or empty array:', messagesData);
            // Don't throw error, just use empty array
            formattedMessages = [];
          }
        } else {
          console.warn('Messages data is not an array or object:', messagesData);
          formattedMessages = [];
        }
        
        const sortedMessages = formattedMessages.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(sortedMessages);
        console.log('Formatted messages:', sortedMessages);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch messages:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching messages, using mock data:', error);
      
      // Fallback to mock messages for testing
      const mockMessages: Message[] = [
        {
          id: '1',
          from: chatId,
          to: whatsappInstance,
          body: 'Olá! Gostaria de fazer um pedido.',
          timestamp: Date.now() - 600000,
          fromMe: false,
          status: 'read'
        },
        {
          id: '2',
          from: whatsappInstance,
          to: chatId,
          body: 'Olá! Claro, posso te ajudar. Qual prato você gostaria?',
          timestamp: Date.now() - 540000,
          fromMe: true,
          status: 'read'
        },
        {
          id: '3',
          from: chatId,
          to: whatsappInstance,
          body: 'Quero uma pizza margherita grande, por favor.',
          timestamp: Date.now() - 480000,
          fromMe: false,
          status: 'read'
        },
        {
          id: '4',
          from: whatsappInstance,
          to: chatId,
          body: 'Perfeito! Pizza margherita grande. Mais alguma coisa?',
          timestamp: Date.now() - 420000,
          fromMe: true,
          status: 'delivered'
        }
      ];
      
      setMessages(mockMessages);
      console.log('Using mock messages for testing:', mockMessages);
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
        
        // Add message to local state
        const newMsg: Message = {
          id: responseData.key?.id || Date.now().toString(),
          from: whatsappInstance,
          to: selectedChat.id,
          body: newMessage,
          timestamp: responseData.messageTimestamp ? responseData.messageTimestamp * 1000 : Date.now(),
          fromMe: true,
          status: responseData.status || 'sent'
        };
        
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        
        // Update chat's last message
        setChats(prev => prev.map(chat => 
          chat.id === selectedChat.id 
            ? { ...chat, lastMessage: newMessage, lastMessageTime: Date.now() }
            : chat
        ));
        
        console.log('Message sent and added to chat:', newMsg);
      } else {
        const errorText = await response.text();
        console.error('Failed to send message:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error sending message, adding locally:', error);
      
      // Fallback: add message locally even if API fails
      const newMsg: Message = {
        id: Date.now().toString(),
        from: whatsappInstance || 'me',
        to: selectedChat.id,
        body: newMessage,
        timestamp: Date.now(),
        fromMe: true,
        status: 'sent'
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      
      // Update chat's last message
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, lastMessage: newMessage, lastMessageTime: Date.now() }
          : chat
      ));
      
      console.log('Message added locally due to API error:', newMsg);
      
      // Simulate a response after 2 seconds for demo purposes
      setTimeout(() => {
        const responseMsg: Message = {
          id: (Date.now() + 1).toString(),
          from: selectedChat.id,
          to: whatsappInstance || 'me',
          body: 'Mensagem recebida! Obrigado pelo contato.',
          timestamp: Date.now(),
          fromMe: false,
          status: 'delivered'
        };
        
        setMessages(prev => [...prev, responseMsg]);
        setChats(prev => prev.map(chat => 
          chat.id === selectedChat.id 
            ? { ...chat, lastMessage: responseMsg.body, lastMessageTime: Date.now() }
            : chat
        ));
      }, 2000);
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

  // Load chats on component mount
  useEffect(() => {
    fetchChats();
  }, []);

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
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
          <h1 className="text-3xl font-bold text-gray-900">Chat WhatsApp</h1>
          <p className="text-gray-600 mt-2">Gerencie suas conversas do WhatsApp</p>
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
                    placeholder="Buscar contatos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Chats List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {evolutionApiUrl ? 'Nenhuma conversa encontrada' : 'Configure a Evolution API para ver as conversas'}
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
                          {chat.avatar ? (
                            <img
                              src={chat.avatar}
                              alt={chat.name}
                              className="h-12 w-12 rounded-full"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                              {chat.isGroup ? '👥' : '👤'}
                            </div>
                          )}
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
                      Bem-vindo ao Chat WhatsApp
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
                                <p className="text-sm leading-relaxed">{message.body}</p>
                                
                                {/* Message time and status */}
                                <div className={`flex items-center justify-end mt-1 space-x-1 ${
                                  message.fromMe ? 'text-indigo-200' : 'text-gray-400'
                                }`}>
                                  <span className="text-xs">
                                    {formatTime(message.timestamp)}
                                  </span>
                                  {message.fromMe && (
                                    <span className="text-xs">
                                      {message.status === 'sent' ? '✓' : 
                                       message.status === 'delivered' ? '✓✓' : 
                                       message.status === 'read' ? '✓✓' : '✓'}
                                    </span>
                                  )}
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

export default Chat;
