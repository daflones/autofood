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
    const { 
      category_id, 
      available_only = 'false',
      search,
      limit = 20,
      offset = 0
    } = req.query;

    let whereClause = {};

    if (category_id) {
      whereClause.category_id = parseInt(category_id);
    }

    if (available_only === 'true') {
      whereClause.is_available = true;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const products = await prisma.products.findMany({
      where: whereClause,
      include: {
        categories: {
          select: { id: true, name: true }
        },
        product_additions: {
          where: { is_active: true }
        }
      },
      orderBy: { name: 'asc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.products.count({ where: whereClause });

    res.status(200).json({
      products,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function handlePost(req, res) {
  try {
    const {
      category_id,
      name,
      description,
      price,
      image_url,
      portion_info,
      preparation_time = 30,
      calories,
      is_available = true,
      is_promotion = false,
      promotion_price,
      ingredients = [],
      allergens = [],
      additions = []
    } = req.body;

    if (!category_id || !name || !price) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: category_id, name, price' 
      });
    }

    // Verificar se a categoria existe
    const category = await prisma.categories.findUnique({
      where: { id: parseInt(category_id) }
    });

    if (!category) {
      return res.status(400).json({ error: 'Categoria não encontrada' });
    }

    const product = await prisma.products.create({
      data: {
        category_id: parseInt(category_id),
        name,
        description,
        price: parseFloat(price),
        image_url,
        portion_info,
        preparation_time: parseInt(preparation_time),
        calories: calories ? parseInt(calories) : null,
        is_available,
        is_promotion,
        promotion_price: promotion_price ? parseFloat(promotion_price) : null,
        ingredients,
        allergens
      }
    });

    // Criar adicionais se fornecidos
    if (additions && additions.length > 0) {
      for (const addition of additions) {
        await prisma.product_additions.create({
          data: {
            product_id: product.id,
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
      where: { id: product.id },
      include: {
        categories: true,
        product_additions: true
      }
    });

    res.status(201).json({
      success: true,
      product: fullProduct,
      message: 'Produto criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
