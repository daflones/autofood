import { PrismaClient } from '@prisma/client';
import NotificationService from '../../../../../lib/notifications';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { status, notes, estimated_delivery } = req.body;

  const validStatuses = [
    'recebido', 'em_preparo', 'pronto', 'saiu_entrega', 'entregue', 'cancelado'
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: 'Status inválido. Valores aceitos: ' + validStatuses.join(', ')
    });
  }

  try {
    // Verificar se o pedido existe
    const existingOrder = await prisma.orders.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Atualizar o pedido
    const updateData = { 
      status, 
      updated_at: new Date() 
    };

    if (estimated_delivery) {
      updateData.estimated_delivery = parseInt(estimated_delivery);
    }

    const updatedOrder = await prisma.orders.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Criar log de status
    await prisma.order_status_log.create({
      data: {
        order_id: parseInt(id),
        status,
        notes: notes || `Status alterado para ${status}`,
        notified_customer: false
      }
    });

    // Enviar notificação baseada no status
    const notificationMap = {
      'em_preparo': 'preparation_started',
      'pronto': 'order_ready',
      'saiu_entrega': 'out_for_delivery',
      'entregue': 'delivered',
      'cancelado': 'cancelled'
    };

    const notificationType = notificationMap[status];
    if (notificationType) {
      await NotificationService.sendOrderNotification(
        parseInt(id), 
        notificationType,
        { deliveryTime: estimated_delivery || 15 }
      );
    }

    res.status(200).json({
      success: true,
      order: updatedOrder,
      message: `Status atualizado para ${status}`
    });

  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
