import { createClient } from '@supabase/supabase-js'

// Main Database Configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create single Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Database types
export interface Category {
  id: number
  name: string
  description?: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  category_id: number
  name: string
  description?: string
  price: number
  image_url?: string
  portion_info?: string
  preparation_time: number
  calories?: number
  is_available: boolean
  is_promotion: boolean
  promotion_price?: number
  ingredients: string[]
  allergens: string[]
  display_order: number
  created_at: string
  updated_at: string
  category?: Category
}

export interface ProductAddition {
  id: number
  product_id: number
  name: string
  price: number
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface RestaurantConfig {
  id: number
  name: string
  phone: string
  address: string
  delivery_fee: number
  min_order_value: number
  max_delivery_distance: number
  is_open: boolean
  opening_hours: {
    [key: string]: {
      open: string
      close: string
      closed: boolean
    }
  }
  payment_methods: string[]
  whatsapp_number: string
  created_at: string
  updated_at: string
}


export interface Order {
  id: number
  order_number: string
  customer_name: string
  customer_phone: string
  customer_address?: string
  delivery_address?: string
  status: 'recebido' | 'em_preparo' | 'pronto' | 'saiu_entrega' | 'entregue' | 'cancelado'
  total_amount: number
  delivery_fee: number
  payment_method: string
  notes?: string
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  additions?: string[]
  notes?: string
  created_at: string
  product?: Product
}

// Helper functions for image uploads
export const uploadProductImage = async (file: File, productId: number): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `product-${productId}-${Date.now()}.${fileExt}`
    const bucketName = import.meta.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'product-images'
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file)

    if (error) {
      console.error('Error uploading image:', error)
      return ''
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    return ''
  }
}

export const uploadCategoryImage = async (file: File, categoryId: number): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `category-${categoryId}-${Date.now()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('category-images')
      .upload(fileName, file)

    if (error) {
      console.error('Error uploading image:', error)
      return ''
    }

    const { data: { publicUrl } } = supabase.storage
      .from('category-images')
      .getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    return ''
  }
}
