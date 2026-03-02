import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Package, AlertTriangle, Edit, Trash2, Truck } from 'lucide-react';

const RawMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    unit: '',
    currentStock: '',
    minStockLevel: '',
    maxStockLevel: '',
    unitCost: '',
    supplier: ''
  });

  useEffect(() => {
    fetchMaterials();
    fetchSuppliers();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await axios.get('/api/inventory/products?category=raw-material');
      setMaterials(response.data.data || []);
      console.log('✅ Raw Materials fetched:', response.data.data?.length || 0);
    } catch (error) {
      console.error('❌ Failed to fetch raw materials:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch raw materials');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('/api/scm/suppliers');
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch suppliers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert numeric fields to Numbers
      const submitData = {
        ...formData,
        currentStock: Number(formData.currentStock) || 0,
        minStockLevel: Number(formData.minStockLevel) || 0,
        maxStockLevel: Number(formData.maxStockLevel) || 0,
        unitCost: Number(formData.unitCost) || 0,
        category: editingMaterial ? undefined : 'raw-material'
      };

      if (editingMaterial) {
        await axios.put(`/api/inventory/products/${editingMaterial._id}`, submitData);
        toast.success('Raw material updated successfully');
      } else {
        await axios.post('/api/inventory/products', submitData);
        toast.success('Raw material created successfully');
      }
      setShowModal(false);
      setEditingMaterial(null);
      setFormData({
        name: '',
        sku: '',
        description: '',
        unit: '',
        currentStock: '',
        minStockLevel: '',
        maxStockLevel: '',
        unitCost: '',
        supplier: ''
      });
      fetchMaterials();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save raw material');
    }
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      sku: material.sku,
      description: material.description || '',
      unit: material.unit,
      currentStock: material.currentStock,
      minStockLevel: material.minStockLevel,
      maxStockLevel: material.maxStockLevel,
      unitCost: material.unitCost,
      supplier: material.supplier?._id || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this raw material?')) {
      try {
        await axios.delete(`/api/inventory/products/${id}`);
        toast.success('Raw material deleted successfully');
        fetchMaterials();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error(error.response?.data?.message || 'Failed to delete raw material');
      }
    }
  };

  const isLowStock = (material) => {
    return material.currentStock <= material.minStockLevel;
  };

  const getStockStatus = (material) => {
    if (material.currentStock === 0) return { color: 'text-red-600', bg: 'bg-red-100', text: 'Out of Stock' };
    if (isLowStock(material)) return { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Low Stock' };
    return { color: 'text-green-600', bg: 'bg-green-100', text: 'In Stock' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raw Materials</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage raw materials and components inventory
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Raw Material
        </button>
      </div>

      {/* Low Stock Alert */}
      {materials.filter(isLowStock).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Low Stock Alert
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{materials.filter(isLowStock).length} raw material(s) are running low on stock.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Materials Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {materials.map((material) => {
          const stockStatus = getStockStatus(material);
          return (
            <div key={material._id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{material.name}</h3>
                      <p className="text-sm text-gray-500">{material.sku}</p>
                    </div>
                  </div>
                  {isLowStock(material) && (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Current Stock</span>
                    <span className={`font-medium ${stockStatus.color}`}>
                      {material.currentStock} {material.unit}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Min Level</span>
                    <span className="text-gray-900">{material.minStockLevel} {material.unit}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Unit Cost</span>
                    <span className="text-gray-900">${material.unitCost}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Value</span>
                    <span className="text-gray-900">${(material.currentStock * material.unitCost).toLocaleString()}</span>
                  </div>
                  {material.supplier && (
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <Truck className="h-4 w-4 mr-1" />
                      <span>{material.supplier.name}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                    {stockStatus.text}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(material)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(material._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingMaterial ? 'Edit Raw Material' : 'Add Raw Material'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Material Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Unit
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Unit Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.unitCost}
                      onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Min Stock Level
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.minStockLevel}
                      onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Max Stock Level
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.maxStockLevel}
                      onChange={(e) => setFormData({ ...formData, maxStockLevel: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Supplier
                  </label>
                  <select
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingMaterial(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                  >
                    {editingMaterial ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RawMaterials;
