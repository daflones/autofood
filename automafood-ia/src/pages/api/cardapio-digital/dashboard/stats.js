import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Pedidos hoje
    const pedidosHoje = await prisma.orders.count({
      where: {
        created_at: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Vendas hoje
    const vendasResult = await prisma.orders.aggregate({
      where: {
        created_at: {
          gte: today,
          lt: tomorrow
        },
        status: {
          not: 'cancelado'
        }
      },
      _sum: {
        total_amount: true
      }
    });

    // Pedidos em andamento
    const pedidosAndamento = await prisma.orders.count({
      where: {
        status: {
          in: ['recebido', 'em_preparo', 'pronto', 'saiu_entrega']
        }
      }
    });

    // Tempo médio de entrega (pedidos entregues hoje)
    const pedidosEntregues = await prisma.orders.findMany({
      where: {
        status: 'entregue',
        created_at: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        order_status_log: true
      }
    });

    let tempoMedio = 0;
    if (pedidosEntregues.length > 0) {
      const tempos = pedidosEntregues.map(pedido => {
        const inicio = new Date(pedido.created_at);
        const entrega = pedido.order_status_log
          .find(log => log.status === 'entregue')?.timestamp;
        
        if (entrega) {
          return (new Date(entrega) - inicio) / (1000 * 60); // minutos
        }
        return 0;
      }).filter(tempo => tempo > 0);

      if (tempos.length > 0) {
        tempoMedio = Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length);
      }
    }

    // Produto mais vendido hoje
    const produtoMaisVendido = await prisma.order_items.groupBy({
      by: ['product_name'],
      where: {
        order: {
          created_at: {
            gte: today,
            lt: tomorrow
          },
          status: {
            not: 'cancelado'
          }
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 1
    });

    // Crescimento semanal
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const pedidosSemanaPassada = await prisma.orders.count({
      where: {
        created_at: {
          gte: lastWeek,
          lt: today
        }
      }
    });

    const crescimentoSemanal = pedidosSemanaPassada > 0 
      ? Math.round(((pedidosHoje - pedidosSemanaPassada) / pedidosSemanaPassada) * 100)
      : 0;

    res.status(200).json({
      pedidosHoje,
      vendaHoje: vendasResult._sum.total_amount || 0,
      pedidosAndamento,
      tempoMedio,
      produtoMaisVendido: produtoMaisVendido[0]?.product_name || '',
      crescimentoSemanal
    });

  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
