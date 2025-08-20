import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      limit = 20, 
      offset = 0, 
      filter = 'todos',
      status,
      customer_phone,
      date_from,
      date_to
    } = req.query;

    let whereClause = {};

    // Filtros
    if (filter !== 'todos') {
      if (filter === 'andamento') {
        whereClause.status = {
          in: ['recebido', 'em_preparo', 'pronto', 'saiu_entrega']
        };
      } else {
        whereClause.status = filter;
      }
    }

    if (status) {
      whereClause.status = status;
    }

    if (customer_phone) {
      whereClause.customer_phone = {
        contains: customer_phone
      };
    }

    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) {
        whereClause.created_at.gte = new Date(date_from);
      }
      if (date_to) {
        whereClause.created_at.lte = new Date(date_to);
      }
    }

    const orders = await prisma.orders.findMany({
      where: whereClause,
      include: {
        order_items: true,
        order_status_log: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { created_at: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.orders.count({ where: whereClause });

    res.status(200).json({
      orders,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
