import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'PUT':
      return handlePut(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req, res) {
  try {
    const config = await prisma.restaurant_config.findFirst();
    
    if (!config) {
      // Criar configuração padrão se não existir
      const defaultConfig = await prisma.restaurant_config.create({
        data: {
          name: 'AutoFood Restaurant',
          phone: '(11) 99999-9999',
          address: 'Rua Principal, 123 - Centro',
          whatsapp_number: '5511999999999',
          delivery_fee: 5.00,
          min_order_value: 20.00,
          max_delivery_distance: 10,
          is_open: true
        }
      });
      return res.status(200).json({ config: defaultConfig });
    }

    res.status(200).json({ config });
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function handlePut(req, res) {
  try {
    const {
      name,
      phone,
      address,
      delivery_fee,
      min_order_value,
      max_delivery_distance,
      is_open,
      opening_hours,
      payment_methods,
      whatsapp_number
    } = req.body;

    const existingConfig = await prisma.restaurant_config.findFirst();
    
    if (!existingConfig) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    const updatedConfig = await prisma.restaurant_config.update({
      where: { id: existingConfig.id },
      data: {
        name: name || existingConfig.name,
        phone: phone || existingConfig.phone,
        address: address || existingConfig.address,
        delivery_fee: delivery_fee !== undefined ? parseFloat(delivery_fee) : existingConfig.delivery_fee,
        min_order_value: min_order_value !== undefined ? parseFloat(min_order_value) : existingConfig.min_order_value,
        max_delivery_distance: max_delivery_distance !== undefined ? parseInt(max_delivery_distance) : existingConfig.max_delivery_distance,
        is_open: is_open !== undefined ? is_open : existingConfig.is_open,
        opening_hours: opening_hours || existingConfig.opening_hours,
        payment_methods: payment_methods || existingConfig.payment_methods,
        whatsapp_number: whatsapp_number || existingConfig.whatsapp_number,
        updated_at: new Date()
      }
    });

    res.status(200).json({
      success: true,
      config: updatedConfig,
      message: 'Configuração atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
