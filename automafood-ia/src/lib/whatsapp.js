// WhatsApp API integration using Evolution API
export class WhatsAppAPI {
  constructor() {
    this.baseURL = process.env.EVOLUTION_API_URL;
    this.apiKey = process.env.EVOLUTION_API_KEY;
    this.instance = process.env.WHATSAPP_INSTANCE;
  }

  async sendMessage(phone, message) {
    try {
      const response = await fetch(`${this.baseURL}/message/sendText/${this.instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        body: JSON.stringify({
          number: phone,
          text: message
        })
      });

      const result = await response.json();
      return response.ok && result.key;
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      return false;
    }
  }

  async sendImage(phone, imageUrl, caption = '') {
    try {
      const response = await fetch(`${this.baseURL}/message/sendMedia/${this.instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        body: JSON.stringify({
          number: phone,
          mediatype: 'image',
          media: imageUrl,
          caption: caption
        })
      });

      const result = await response.json();
      return response.ok && result.key;
    } catch (error) {
      console.error('Erro ao enviar imagem WhatsApp:', error);
      return false;
    }
  }

  formatPhoneNumber(phone) {
    // Remove caracteres especiais e adiciona código do país se necessário
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('11')) {
      return `55${cleaned}`;
    }
    if (cleaned.length === 10) {
      return `5511${cleaned}`;
    }
    return cleaned;
  }
}

export default new WhatsAppAPI();
