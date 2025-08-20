import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, id);
    case 'PUT':
      return handlePut(req, res, id);
    case 'DELETE':
      return handleDelete(req, res, id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req, res, id) {
  try {
    const category = await prisma.categories.findUnique({
      where: { id: parseInt(id) },
      include: {
        products: {
          where: { is_available: true },
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    res.status(200).json({ category });
  } catch (error) {
    console.error('Erro ao buscar categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function handlePut(req, res, id) {
  try {
    const { name, description, image_url, is_active, order_position } = req.body;

    const existingCategory = await prisma.categories.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const category = await prisma.categories.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingCategory.name,
        description,
        image_url,
        is_active: is_active !== undefined ? is_active : existingCategory.is_active,
        order_position: order_position || existingCategory.order_position,
        updated_at: new Date()
      }
    });

    res.status(200).json({ 
      success: true, 
      category,
      message: 'Categoria atualizada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function handleDelete(req, res, id) {
  try {
    const existingCategory = await prisma.categories.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    if (existingCategory._count.products > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir categoria com produtos associados' 
      });
    }

    await prisma.categories.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({ 
      success: true,
      message: 'Categoria excluída com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
