import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/dashboard/summary');
      // API returns { data: { totalMedicines, lowStockCount, ..., recentTransactions } }
      const dashData = response.data.data || response.data.summary || response.data;
      setSummary(dashData);
      setRecentTransactions(dashData.recentTransactions || []);
    } catch (err) {
      setError('Failed to load dashboard data.');
      // Provide fallback data for demo
      setSummary({
        totalMedicines: 0,
        lowStockCount: 0,
        expiringCount: 0,
        pendingPrescriptions: 0,
        totalValue: 0
      });
    } finally {
      setLoading(false);
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

  const summaryCards = [
    { label: 'TOTAL MEDICINES', value: summary?.totalMedicines || 0 },
    { label: 'LOW STOCK', value: summary?.lowStockCount || 0, link: '/alerts' },
    { label: 'EXPIRING SOON', value: summary?.expiringCount || 0, link: '/inventory' },
    { label: 'PENDING RX', value: summary?.pendingPrescriptions || 0, link: '/prescriptions' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Overview</h1>
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      <div className="card-grid mb-lg">
        {summaryCards.map((card, index) => (
          <div key={index} className="summary-card">
            <div className="card-label">{card.label}</div>
            <div className="card-value data-value">{card.value}</div>
            {card.link && card.value > 0 && (
              <Link to={card.link} className="card-link">
                View details &rarr;
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">RECENT TRANSACTIONS</h2>
          <Link to="/inventory" className="btn btn-secondary btn-sm">View All</Link>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>MEDICINE</th>
                  <th>TYPE</th>
                  <th>QUANTITY</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx, index) => {
                  const txType = tx.type || (tx.change_qty > 0 ? 'IN' : 'OUT');
                  const txQty = tx.quantity || Math.abs(tx.change_qty);
                  return (
                    <tr key={tx.id || index}>
                      <td>{tx.medicine_name || tx.medicineName || tx.name}</td>
                      <td>
                        <span className={`status-dot status-dot--${txType === 'IN' ? 'fulfilled' : 'pending'}`}>
                          {txType}
                        </span>
                      </td>
                      <td className="data-value">{txQty}</td>
                      <td>{new Date(tx.created_at || tx.date || tx.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No Recent Transactions</h3>
            <p>Transactions will appear here as inventory changes are made.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
