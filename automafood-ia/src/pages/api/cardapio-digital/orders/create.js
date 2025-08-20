import { PrismaClient } from '@prisma/client';
import NotificationService from '../../../../lib/notifications';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      customer_phone,
      customer_name,
      delivery_address,
      payment_method,
      notes,
      items,
      external_order_id
    } = req.body;

    // Validar dados obrigatórios
    if (!customer_phone || !customer_name || !items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Dados obrigatórios: customer_phone, customer_name, items' 
      });
    }

    // Validar itens e calcular total
    let total_amount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await prisma.products.findUnique({
        where: { id: item.product_id },
        include: { product_additions: true }
      });

      if (!product || !product.is_available) {
        return res.status(400).json({ 
          error: `Produto ${item.product_id} não encontrado ou indisponível` 
        });
      }

      let item_total = product.price * item.quantity;
      
      // Calcular adicionais
      if (item.additions && item.additions.length > 0) {
        for (const addition of item.additions) {
          const productAddition = product.product_additions.find(
            pa => pa.id === addition.addition_id
          );
          if (productAddition) {
            item_total += productAddition.price * addition.quantity * item.quantity;
          }
        }
      }

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        additions: item.additions || [],
        total_price: item_total
      });

      total_amount += item_total;
    }

    // Gerar número do pedido
    const order_number = await generateOrderNumber();

    // Criar pedido
    const order = await prisma.orders.create({
      data: {
        order_number,
        customer_phone,
        customer_name,
        status: 'recebido',
        total_amount,
        delivery_address,
        payment_method: payment_method || 'dinheiro',
        notes,
        external_order_id
      }
    });

    // Criar itens do pedido
    for (const item of validatedItems) {
      await prisma.order_items.create({
        data: {
          order_id: order.id,
          ...item
        }
      });
    }

    // Criar log de status inicial
    await prisma.order_status_log.create({
      data: {
        order_id: order.id,
        status: 'recebido',
        notes: 'Pedido recebido via WhatsApp'
      }
    });

    // Enviar notificação de confirmação
    await NotificationService.sendOrderNotification(order.id, 'order_confirmed');

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        status: order.status
      },
      message: 'Pedido criado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `PED${timestamp}${random}`;
}
