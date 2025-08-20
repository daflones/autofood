import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req, res) {
  try {
    const { active_only = 'false' } = req.query;

    const whereClause = active_only === 'true' ? { is_active: true } : {};

    const categories = await prisma.categories.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { order_position: 'asc' }
    });

    res.status(200).json({ categories });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function handlePost(req, res) {
  try {
    const { name, description, image_url, is_active = true, order_position } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
    }

    // Se não especificou posição, colocar no final
    let finalOrderPosition = order_position;
    if (!finalOrderPosition) {
      const lastCategory = await prisma.categories.findFirst({
        orderBy: { order_position: 'desc' }
      });
      finalOrderPosition = (lastCategory?.order_position || 0) + 1;
    }

    const category = await prisma.categories.create({
      data: {
        name,
        description,
        image_url,
        is_active,
        order_position: finalOrderPosition
      }
    });

    res.status(201).json({ 
      success: true, 
      category,
      message: 'Categoria criada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
