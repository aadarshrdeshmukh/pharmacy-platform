import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/medicines/alerts');
      const data = response.data.alerts || response.data || [];
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch alerts.');
    } finally {
      setLoading(false);
    }
  };

  const getUrgency = (medicine) => {
    if (medicine.quantity === 0) return 'critical';
    if (medicine.quantity <= (medicine.reorderLevel || 10) * 0.5) return 'critical';
    if (medicine.quantity <= (medicine.reorderLevel || 10)) return 'warning';
    return 'info';
  };

  const getUrgencyText = (urgency) => {
    switch (urgency) {
      case 'critical': return 'Critical';
      case 'warning': return 'Warning';
      default: return 'Info';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterType === 'all') return true;
    return getUrgency(alert) === filterType;
  });

  const criticalCount = alerts.filter(a => getUrgency(a) === 'critical').length;
  const warningCount = alerts.filter(a => getUrgency(a) === 'warning').length;

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
      <div className="page-header">
        <h1>Stock Alerts</h1>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}

      <div className="card-grid mb-lg">
        <div className="summary-card">
          <div className="card-label">CRITICAL</div>
          <div className="card-value data-value">{criticalCount}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">WARNING</div>
          <div className="card-value data-value">{warningCount}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">TOTAL</div>
          <div className="card-value data-value">{alerts.length}</div>
        </div>
      </div>

      <div className="toolbar">
        <select
          className="form-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Alerts ({alerts.length})</option>
          <option value="critical">Critical ({criticalCount})</option>
          <option value="warning">Warning ({warningCount})</option>
        </select>
        <Link to="/inventory" className="btn btn-secondary btn-sm">Go to Inventory &rarr;</Link>
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="empty-state">
          <h3>No Alerts</h3>
          <p>{filterType === 'all' ? 'All stock levels are healthy.' : `No ${filterType} alerts found.`}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filteredAlerts.map((medicine, index) => {
            const urgency = getUrgency(medicine);
            return (
              <div
                key={medicine.id || index}
                className={`alert-card urgency-${urgency}`}
              >
                <div className="alert-details" style={{ flex: 1 }}>
                  <h3>{medicine.name}</h3>
                  <div className="alert-meta">
                    <span>Stock: <strong className={urgency === 'critical' ? 'text-danger' : 'text-warning'}>{medicine.quantity}</strong> / Reorder at {medicine.reorderLevel || 10}</span>
                    <span>Category: {medicine.category || 'N/A'}</span>
                    {medicine.manufacturer && <span>Mfr: {medicine.manufacturer}</span>}
                  </div>
                </div>
                <div>
                  <span className={`status-dot status-dot--${urgency}`}>
                    {getUrgencyText(urgency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
