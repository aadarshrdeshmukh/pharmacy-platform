import React, { useState, useEffect } from 'react';
import api from '../api';

const PrescriptionsPage = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    patientName: '',
    patientAge: '',
    patientPhone: '',
    doctorName: '',
    notes: '',
    items: [{ medicineId: '', quantity: 1 }]
  });

  useEffect(() => {
    fetchPrescriptions();
    fetchMedicines();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/prescriptions');
      const rxData = response.data.prescriptions || response.data || [];
      setPrescriptions(Array.isArray(rxData) ? rxData : []);
    } catch (err) {
      setError('Failed to fetch prescriptions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicines = async () => {
    try {
      const response = await api.get('/api/medicines');
      const medData = response.data.medicines || response.data || [];
      setMedicines(Array.isArray(medData) ? medData : []);
    } catch (err) {
      console.error('Failed to fetch medicines for dropdown');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: field === 'quantity' ? parseInt(value, 10) || 1 : value };
    setFormData({ ...formData, items: updated });
  };

  const addLineItem = () => {
    setFormData({ ...formData, items: [...formData.items, { medicineId: '', quantity: 1 }] });
  };

  const removeLineItem = (index) => {
    if (formData.items.length <= 1) return;
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        patient_name: formData.patientName,
        doctor_name: formData.doctorName,
        patient_age: parseInt(formData.patientAge, 10),
        patient_phone: formData.patientPhone,
        notes: formData.notes,
        items: formData.items.map(item => ({
          medicine_id: item.medicineId,
          quantity: item.quantity
        }))
      };
      await api.post('/api/prescriptions', payload);
      setSuccess('Prescription created successfully.');
      setShowModal(false);
      setFormData({
        patientName: '', patientAge: '', patientPhone: '',
        doctorName: '', notes: '', items: [{ medicineId: '', quantity: 1 }]
      });
      fetchPrescriptions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create prescription.');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/api/prescriptions/${id}`, { status: newStatus });
      setSuccess(`Prescription ${newStatus} successfully.`);
      fetchPrescriptions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update prescription status.');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header flex-between">
        <h1>Prescriptions</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Prescription</button>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}
      {success && <div className="alert alert-success"><span>{success}</span></div>}

      {prescriptions.length === 0 ? (
        <div className="empty-state">
          <h3>No Prescriptions Yet</h3>
          <p>Create your first prescription to get started.</p>
          <button className="btn btn-primary mt-md" onClick={() => setShowModal(true)}>+ New Prescription</button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>PATIENT</th>
                <th>DOCTOR</th>
                <th>ITEMS</th>
                <th>STATUS</th>
                <th>CREATED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => (
                <tr key={rx.id}>
                  <td><code style={{ fontSize: '0.75rem' }}>#{rx.id}</code></td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{rx.patient_name || rx.patientName}</div>
                    {(rx.patient_phone || rx.patientPhone) && (
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{rx.patient_phone || rx.patientPhone}</div>
                    )}
                  </td>
                  <td>{rx.doctor_name || rx.doctorName || '\u2014'}</td>
                  <td className="data-value">
                    {rx.items?.length || 0} item{(rx.items?.length || 0) !== 1 ? 's' : ''}
                  </td>
                  <td>
                    <span className={`status-dot status-dot--${rx.status || 'pending'}`}>
                      {rx.status || 'pending'}
                    </span>
                  </td>
                  <td>{new Date(rx.created_at || rx.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-sm">
                      {rx.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleStatusChange(rx.id, 'fulfilled')}
                          >Fulfill</button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleStatusChange(rx.id, 'cancelled')}
                          >Cancel</button>
                        </>
                      )}
                      {rx.status !== 'pending' && (
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>{'\u2014'}</span>
                      )}
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
              <h2>New Prescription</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">PATIENT NAME *</label>
                  <input className="form-input" name="patientName" value={formData.patientName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">PATIENT AGE</label>
                  <input className="form-input" type="number" name="patientAge" value={formData.patientAge} onChange={handleChange} min="0" max="150" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">PATIENT PHONE</label>
                  <input className="form-input" name="patientPhone" value={formData.patientPhone} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">DOCTOR NAME *</label>
                  <input className="form-input" name="doctorName" value={formData.doctorName} onChange={handleChange} required />
                </div>
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <div className="flex-between mb-sm">
                  <label className="form-label" style={{ margin: 0 }}>MEDICINES *</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addLineItem}>+ Add Item</button>
                </div>
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-sm mb-sm" style={{ alignItems: 'flex-end' }}>
                    <div style={{ flex: 2 }}>
                      <select
                        className="form-select"
                        value={item.medicineId}
                        onChange={(e) => handleItemChange(index, 'medicineId', e.target.value)}
                        required
                      >
                        <option value="">Select medicine...</option>
                        {medicines.map(med => (
                          <option key={med.id} value={med.id}>
                            {med.name} (Stock: {med.quantity})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        className="form-input"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        required
                      />
                    </div>
                    {formData.items.length > 1 && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeLineItem(index)}>Remove</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">NOTES</label>
                <textarea className="form-input" name="notes" value={formData.notes} onChange={handleChange} rows="3" style={{ resize: 'vertical' }} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Prescription</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionsPage;
