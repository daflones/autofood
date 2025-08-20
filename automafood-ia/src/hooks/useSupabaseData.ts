import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Category, Product, RestaurantConfig, Order } from '../lib/supabase'

// Hook for categories
export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const createCategory = async (categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([categoryData])
        .select()
        .single()

      if (error) throw error
      await fetchCategories()
      return data
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao criar categoria')
    }
  }

  const updateCategory = async (id: number, updates: Partial<Category>) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchCategories()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar categoria')
    }
  }

  const deleteCategory = async (id: number) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchCategories()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir categoria')
    }
  }

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory
  }
}

// Hook for products
export const useProducts = (categoryId?: number) => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*)
        `)
        .order('display_order', { ascending: true })

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      const { data, error } = await query

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [categoryId])

  const createProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single()

      if (error) throw error
      await fetchProducts()
      return data
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao criar produto')
    }
  }

  const updateProduct = async (id: number, updates: Partial<Product>) => {
    try {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchProducts()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar produto')
    }
  }

  const deleteProduct = async (id: number) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchProducts()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir produto')
    }
  }

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct
  }
}

// Hook for restaurant config
export const useRestaurantConfig = () => {
  const [config, setConfig] = useState<RestaurantConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('restaurant_config')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setConfig(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configuração')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const updateConfig = async (updates: Partial<RestaurantConfig>) => {
    try {
      if (config?.id) {
        const { error } = await supabase
          .from('restaurant_config')
          .update(updates)
          .eq('id', config.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('restaurant_config')
          .insert([updates])

        if (error) throw error
      }
      await fetchConfig()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao salvar configuração')
    }
  }

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
    updateConfig
  }
}

// Hook for orders
export const useOrders = (status?: string) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .order('created_at', { ascending: false })

      if (status && status !== 'todos') {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [status])

  const updateOrderStatus = async (id: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      // Log status change
      await supabase
        .from('order_status_logs')
        .insert([{
          order_id: id,
          status: newStatus
        }])

      await fetchOrders()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar status do pedido')
    }
  }

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    updateOrderStatus
  }
}

// Hook for dashboard stats
export const useDashboardStats = () => {
  const [stats, setStats] = useState({
    pedidosHoje: 0,
    vendaHoje: 0,
    pedidosAndamento: 0,
    tempoMedio: 0
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]

      // Orders today
      const { count: ordersToday } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)

      // Sales today
      const { data: salesData } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)
        .eq('status', 'entregue')

      const salesToday = salesData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0

      // Orders in progress
      const { count: ordersInProgress } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['recebido', 'em_preparo', 'pronto', 'saiu_entrega'])

      setStats({
        pedidosHoje: ordersToday || 0,
        vendaHoje: salesToday,
        pedidosAndamento: ordersInProgress || 0,
        tempoMedio: 25 // This would need more complex calculation
      })
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    loading,
    refetch: fetchStats
  }
}
