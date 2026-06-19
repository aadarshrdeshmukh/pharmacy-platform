import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

const InventoryPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [formData, setFormData] = useState({
    name: '', genericName: '', category: '', manufacturer: '',
    batchNumber: '', quantity: '', unitPrice: '', expiryDate: '',
    reorderLevel: '', description: ''
  });

  const fetchMedicines = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterCategory) params.category = filterCategory;
      const response = await api.get('/api/medicines', { params });
      const data = response.data.medicines || response.data || [];
      setMedicines(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch medicines.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterCategory]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const getExpiryClass = (expiryDate) => {
    if (!expiryDate) return '';
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 0) return 'expiry-expired';
    if (daysUntilExpiry <= 30) return 'expiry-soon';
    return '';
  };

  const getExpiryLabel = (expiryDate) => {
    if (!expiryDate) return '';
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 0) return ' (EXPIRED)';
    if (daysUntilExpiry <= 30) return ` (${daysUntilExpiry}d left)`;
    return '';
  };

  const resetForm = () => {
    setFormData({
      name: '', genericName: '', category: '', manufacturer: '',
      batchNumber: '', quantity: '', unitPrice: '', expiryDate: '',
      reorderLevel: '', description: ''
    });
    setEditingMedicine(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (medicine) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name || '',
      genericName: medicine.genericName || '',
      category: medicine.category || '',
      manufacturer: medicine.manufacturer || '',
      batchNumber: medicine.batchNumber || '',
      quantity: medicine.quantity || '',
      unitPrice: medicine.unitPrice || '',
      expiryDate: medicine.expiryDate ? medicine.expiryDate.split('T')[0] : '',
      reorderLevel: medicine.reorderLevel || '',
      description: medicine.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...formData,
        quantity: parseInt(formData.quantity, 10),
        unitPrice: parseFloat(formData.unitPrice),
        reorderLevel: parseInt(formData.reorderLevel, 10) || 10
      };

      if (editingMedicine) {
        await api.put(`/api/medicines/${editingMedicine.id}`, payload);
        setSuccess('Medicine updated successfully.');
      } else {
        await api.post('/api/medicines', payload);
        setSuccess('Medicine added successfully.');
      }

      setShowModal(false);
      resetForm();
      fetchMedicines();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save medicine.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.delete(`/api/medicines/${id}`);
      setSuccess(`"${name}" deleted successfully.`);
      fetchMedicines();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete medicine.');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const categories = [...new Set(medicines.map(m => m.category).filter(Boolean))];

  return (
    <div className="page-container">
      <div className="page-header flex-between">
        <h1>Inventory</h1>
        <button className="btn btn-primary" onClick={openAddModal}>+ Add Medicine</button>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}
      {success && <div className="alert alert-success"><span>{success}</span></div>}

      <div className="toolbar">
        <div className="search-input">
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="text-muted">Loading...</p>
        </div>
      ) : medicines.length === 0 ? (
        <div className="empty-state">
          <h3>No Medicines Found</h3>
          <p>Add your first medicine to get started.</p>
          <button className="btn btn-primary mt-md" onClick={openAddModal}>+ Add Medicine</button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>CATEGORY</th>
                <th>BATCH</th>
                <th>QUANTITY</th>
                <th>UNIT PRICE</th>
                <th>EXPIRY DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((med) => (
                <tr
                  key={med.id}
                  className={med.quantity <= (med.reorderLevel || 10) ? 'low-stock-row' : ''}
                >
                  <td>
                    <div style={{ fontWeight: 500 }}>{med.name}</div>
                    {med.genericName && (
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{med.genericName}</div>
                    )}
                  </td>
                  <td>{med.category || '\u2014'}</td>
                  <td><code style={{ fontSize: '0.75rem' }}>{med.batchNumber || '\u2014'}</code></td>
                  <td>
                    <span className="data-value">{med.quantity}</span>
                  </td>
                  <td className="data-value">${parseFloat(med.unitPrice || 0).toFixed(2)}</td>
                  <td className={getExpiryClass(med.expiryDate)}>
                    {med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : '\u2014'}
                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>{getExpiryLabel(med.expiryDate)}</span>
                  </td>
                  <td>
                    <div className="flex gap-sm">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(med)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(med.id, med.name)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">MEDICINE NAME *</label>
                  <input className="form-input" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">GENERIC NAME</label>
                  <input className="form-input" name="genericName" value={formData.genericName} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CATEGORY</label>
                  <input className="form-input" name="category" value={formData.category} onChange={handleChange} placeholder="e.g., Analgesic, Antibiotic" />
                </div>
                <div className="form-group">
                  <label className="form-label">MANUFACTURER</label>
                  <input className="form-input" name="manufacturer" value={formData.manufacturer} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">BATCH NUMBER</label>
                  <input className="form-input" name="batchNumber" value={formData.batchNumber} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">QUANTITY *</label>
                  <input className="form-input" type="number" name="quantity" value={formData.quantity} onChange={handleChange} required min="0" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">UNIT PRICE ($) *</label>
                  <input className="form-input" type="number" step="0.01" name="unitPrice" value={formData.unitPrice} onChange={handleChange} required min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">EXPIRY DATE *</label>
                  <input className="form-input" type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">REORDER LEVEL</label>
                <input className="form-input" type="number" name="reorderLevel" value={formData.reorderLevel} onChange={handleChange} placeholder="Default: 10" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">DESCRIPTION</label>
                <textarea className="form-input" name="description" value={formData.description} onChange={handleChange} rows="3" style={{ resize: 'vertical' }} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingMedicine ? 'Update Medicine' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
