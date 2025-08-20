import { WhatsAppAPI } from './whatsapp';
import { PrismaClient } from '@prisma/client';

const whatsapp = new WhatsAppAPI();
const prisma = new PrismaClient();

export class NotificationService {
  constructor() {
    this.templates = {
      order_confirmed: {
        message: "✅ *Pedido Confirmado!*\n\n📋 Número: #{orderNumber}\n💰 Total: R$ {total}\n⏰ Tempo estimado: {estimatedTime} min\n\n📍 Endereço: {address}\n💳 Pagamento: {payment}\n\nObrigado pela preferência! 🍕",
        timing: 'immediate'
      },
      preparation_started: {
        message: "👨‍🍳 *Seu pedido está sendo preparado!*\n\n📋 Pedido: #{orderNumber}\n⏰ Previsão: {estimatedTime} min\n\nEstamos caprichando no seu pedido! 😋",
        timing: 'immediate'
      },
      order_ready: {
        message: "🍕 *Pedido Pronto!*\n\n📋 Pedido: #{orderNumber}\n🚗 Saindo para entrega em breve\n\nSeu pedido está prontinho e saboroso! 🤤",
        timing: 'immediate'
      },
      out_for_delivery: {
        message: "🚗 *Saiu para Entrega!*\n\n📋 Pedido: #{orderNumber}\n📍 Chegará em aproximadamente {deliveryTime} min\n\nNosso entregador está a caminho! 🏃‍♂️",
        timing: 'immediate'
      },
      delivered: {
        message: "✅ *Pedido Entregue!*\n\n📋 Pedido: #{orderNumber}\n\nObrigado pela preferência! Esperamos você novamente em breve! 🙏\n\n⭐ Que tal avaliar nosso atendimento?",
        timing: 'immediate'
      },
      cancelled: {
        message: "❌ *Pedido Cancelado*\n\n📋 Pedido: #{orderNumber}\n\nSeu pedido foi cancelado. Em caso de dúvidas, entre em contato conosco.\n\nDesculpe pelo inconveniente! 😔",
        timing: 'immediate'
      }
    };
  }

  async sendOrderNotification(orderId, status, additionalData = {}) {
    try {
      const order = await this.getOrderDetails(orderId);
      const template = this.templates[status];
      
      if (!template) {
        console.warn(`Template não encontrado para status: ${status}`);
        return false;
      }

      const message = this.formatMessage(template.message, {
        orderNumber: order.order_number,
        total: order.total_amount.toFixed(2),
        estimatedTime: order.estimated_delivery || 30,
        deliveryTime: additionalData.deliveryTime || 15,
        address: order.delivery_address || 'Retirada no local',
        payment: this.formatPaymentMethod(order.payment_method),
        ...additionalData
      });

      const success = await whatsapp.sendMessage(order.customer_phone, message);
      
      if (success) {
        // Marcar como notificado no log
        await this.markAsNotified(orderId, status);
        console.log(`Notificação enviada: ${status} para ${order.customer_phone}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }
  }

  formatMessage(template, data) {
    let message = template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      message = message.replace(regex, data[key]);
    });
    return message;
  }

  formatPaymentMethod(method) {
    const methods = {
      'dinheiro': '💵 Dinheiro',
      'pix': '📱 PIX',
      'cartao': '💳 Cartão',
      'debito': '💳 Débito',
      'credito': '💳 Crédito'
    };
    return methods[method] || method;
  }

  async getOrderDetails(orderId) {
    return await prisma.orders.findUnique({
      where: { id: orderId }
    });
  }

  async markAsNotified(orderId, status) {
    await prisma.order_status_log.updateMany({
      where: { 
        order_id: orderId, 
        status: status 
      },
      data: { 
        notified_customer: true 
      }
    });
  }
}

export default new NotificationService();
