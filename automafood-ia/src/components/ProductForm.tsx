import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface Category {
  id: number;
  name: string;
}

interface Addition {
  id?: number;
  name: string;
  price: number;
  is_required: boolean;
  max_quantity: number;
}

interface Product {
  id?: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  portion_info?: string;
  preparation_time: number;
  calories?: number;
  is_available: boolean;
  is_promotion: boolean;
  promotion_price?: number;
  ingredients: string[];
  allergens: string[];
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSave: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, product, onSave }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Product>({
    category_id: 0,
    name: '',
    description: '',
    price: 0,
    image_url: '',
    portion_info: '',
    preparation_time: 30,
    calories: 0,
    is_available: true,
    is_promotion: false,
    promotion_price: 0,
    ingredients: [],
    allergens: []
  });
  const [additions, setAdditions] = useState<Addition[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [newAllergen, setNewAllergen] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (product) {
        setFormData(product);
        loadProductAdditions(product.id!);
      } else {
        resetForm();
      }
    }
  }, [isOpen, product]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/cardapio-digital/categories?active_only=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadProductAdditions = async (productId: number) => {
    try {
      const response = await fetch(`/api/cardapio-digital/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        setAdditions(data.product.product_additions || []);
      }
    } catch (error) {
      console.error('Erro ao carregar adicionais:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      category_id: 0,
      name: '',
      description: '',
      price: 0,
      image_url: '',
      portion_info: '',
      preparation_time: 30,
      calories: 0,
      is_available: true,
      is_promotion: false,
      promotion_price: 0,
      ingredients: [],
      allergens: []
    });
    setAdditions([]);
    setNewIngredient('');
    setNewAllergen('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category_id || !formData.price) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const url = product 
        ? `/api/cardapio-digital/products/${product.id}`
        : '/api/cardapio-digital/products';
      
      const method = product ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          additions: additions.filter(add => add.name.trim() !== '')
        }),
      });

      if (response.ok) {
        toast.success(product ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!');
        onSave();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar produto');
      }
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast.error('Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    setImageUploading(true);
    try {
      // Simular upload - em produção, usar Cloudinary ou AWS S3
      const formData = new FormData();
      formData.append('file', file);
      
      // Por enquanto, usar uma URL de exemplo
      const imageUrl = `https://via.placeholder.com/400x300?text=${encodeURIComponent(file.name)}`;
      
      setFormData(prev => ({ ...prev, image_url: imageUrl }));
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setImageUploading(false);
    }
  };

  const addIngredient = () => {
    if (newIngredient.trim() && !formData.ingredients.includes(newIngredient.trim())) {
      setFormData(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, newIngredient.trim()]
      }));
      setNewIngredient('');
    }
  };

  const removeIngredient = (ingredient: string) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(i => i !== ingredient)
    }));
  };

  const addAllergen = () => {
    if (newAllergen.trim() && !formData.allergens.includes(newAllergen.trim())) {
      setFormData(prev => ({
        ...prev,
        allergens: [...prev.allergens, newAllergen.trim()]
      }));
      setNewAllergen('');
    }
  };

  const removeAllergen = (allergen: string) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.filter(a => a !== allergen)
    }));
  };

  const addAddition = () => {
    setAdditions(prev => [...prev, {
      name: '',
      price: 0,
      is_required: false,
      max_quantity: 1
    }]);
  };

  const updateAddition = (index: number, field: keyof Addition, value: any) => {
    setAdditions(prev => prev.map((add, i) => 
      i === index ? { ...add, [field]: value } : add
    ));
  };

  const removeAddition = (index: number) => {
    setAdditions(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {product ? 'Editar Produto' : 'Novo Produto'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData(prev => ({ ...prev, category_id: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value={0}>Selecione uma categoria</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Produto *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Preço e Promoção */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_promotion"
                checked={formData.is_promotion}
                onChange={(e) => setFormData(prev => ({ ...prev, is_promotion: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="is_promotion" className="ml-2 block text-sm text-gray-900">
                Em promoção
              </label>
            </div>

            {formData.is_promotion && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço Promocional
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.promotion_price || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, promotion_price: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Imagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagem do Produto
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                {imageUploading ? 'Carregando...' : 'Escolher Imagem'}
              </label>
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="h-16 w-16 object-cover rounded-md"
                />
              )}
            </div>
          </div>

          {/* Detalhes Adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Informação da Porção
              </label>
              <input
                type="text"
                value={formData.portion_info || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, portion_info: e.target.value }))}
                placeholder="Ex: Serve 2 pessoas"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tempo de Preparo (min)
              </label>
              <input
                type="number"
                value={formData.preparation_time}
                onChange={(e) => setFormData(prev => ({ ...prev, preparation_time: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calorias
              </label>
              <input
                type="number"
                value={formData.calories || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Ingredientes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingredientes
            </label>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                placeholder="Adicionar ingrediente"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
              />
              <button
                type="button"
                onClick={addIngredient}
                className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.ingredients.map((ingredient, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  {ingredient}
                  <button
                    type="button"
                    onClick={() => removeIngredient(ingredient)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Alérgenos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alérgenos
            </label>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={newAllergen}
                onChange={(e) => setNewAllergen(e.target.value)}
                placeholder="Adicionar alérgeno"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergen())}
              />
              <button
                type="button"
                onClick={addAllergen}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.allergens.map((allergen, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                >
                  {allergen}
                  <button
                    type="button"
                    onClick={() => removeAllergen(allergen)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Adicionais */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Adicionais
              </label>
              <button
                type="button"
                onClick={addAddition}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </button>
            </div>
            
            <div className="space-y-3">
              {additions.map((addition, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center p-3 border border-gray-200 rounded-md">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Nome do adicional"
                      value={addition.name}
                      onChange={(e) => updateAddition(index, 'name', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Preço"
                      value={addition.price}
                      onChange={(e) => updateAddition(index, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Máx. qtd"
                      value={addition.max_quantity}
                      onChange={(e) => updateAddition(index, 'max_quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2 flex items-center">
                    <input
                      type="checkbox"
                      checked={addition.is_required}
                      onChange={(e) => updateAddition(index, 'is_required', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-1 text-xs text-gray-700">Obrigatório</label>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeAddition(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_available"
              checked={formData.is_available}
              onChange={(e) => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="is_available" className="ml-2 block text-sm text-gray-900">
              Produto disponível
            </label>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
