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
    const product = await prisma.products.findUnique({
      where: { id: parseInt(id) },
      include: {
        categories: true,
        product_additions: {
          where: { is_active: true }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.status(200).json({ product });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function handlePut(req, res, id) {
  try {
    const {
      category_id,
      name,
      description,
      price,
      image_url,
      portion_info,
      preparation_time,
      calories,
      is_available,
      is_promotion,
      promotion_price,
      ingredients,
      allergens,
      additions
    } = req.body;

    const existingProduct = await prisma.products.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Verificar categoria se fornecida
    if (category_id) {
      const category = await prisma.categories.findUnique({
        where: { id: parseInt(category_id) }
      });
      if (!category) {
        return res.status(400).json({ error: 'Categoria não encontrada' });
      }
    }

    const product = await prisma.products.update({
      where: { id: parseInt(id) },
      data: {
        category_id: category_id ? parseInt(category_id) : existingProduct.category_id,
        name: name || existingProduct.name,
        description,
        price: price ? parseFloat(price) : existingProduct.price,
        image_url,
        portion_info,
        preparation_time: preparation_time ? parseInt(preparation_time) : existingProduct.preparation_time,
        calories: calories ? parseInt(calories) : existingProduct.calories,
        is_available: is_available !== undefined ? is_available : existingProduct.is_available,
        is_promotion: is_promotion !== undefined ? is_promotion : existingProduct.is_promotion,
        promotion_price: promotion_price ? parseFloat(promotion_price) : existingProduct.promotion_price,
        ingredients: ingredients || existingProduct.ingredients,
        allergens: allergens || existingProduct.allergens,
        updated_at: new Date()
      }
    });

    // Atualizar adicionais se fornecidos
    if (additions) {
      // Remover adicionais existentes
      await prisma.product_additions.deleteMany({
        where: { product_id: parseInt(id) }
      });

      // Criar novos adicionais
      for (const addition of additions) {
        await prisma.product_additions.create({
          data: {
            product_id: parseInt(id),
            name: addition.name,
            price: parseFloat(addition.price || 0),
            is_required: addition.is_required || false,
            max_quantity: parseInt(addition.max_quantity || 1)
          }
        });
      }
    }

    // Buscar produto completo para retorno
    const fullProduct = await prisma.products.findUnique({
      where: { id: parseInt(id) },
      include: {
        categories: true,
        product_additions: true
      }
    });

    res.status(200).json({
      success: true,
      product: fullProduct,
      message: 'Produto atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function handleDelete(req, res, id) {
  try {
    const existingProduct = await prisma.products.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Verificar se há pedidos com este produto
    const orderItems = await prisma.order_items.count({
      where: { product_id: parseInt(id) }
    });

    if (orderItems > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir produto que já foi pedido. Desative-o em vez disso.'
      });
    }

    await prisma.products.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({
      success: true,
      message: 'Produto excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
