import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const features = [
    {
      icon: '\u2197',
      title: 'Know what you have',
      description: 'See every medicine, every batch, every quantity in one place. No more counting shelves or guessing what\'s left.'
    },
    {
      icon: 'Rx',
      title: 'Prescriptions that flow',
      description: 'Add a patient, pick their medicines, hit fulfill. Stock updates itself. That\'s it.'
    },
    {
      icon: '\u25B3',
      title: 'Nothing expires unnoticed',
      description: 'Medicines nearing their expiry date get flagged automatically. You decide the window — 30 days, 60, whatever works.'
    },
    {
      icon: '\u25A1',
      title: 'The right people, the right access',
      description: 'Admins manage users and settings. Pharmacists handle day-to-day. Everyone sees only what they need.'
    },
    {
      icon: '\u2014',
      title: 'Restock before you run out',
      description: 'Set a threshold for each medicine. When stock dips below it, you\'ll know immediately — not when a patient is waiting.'
    },
    {
      icon: '\u00B7',
      title: 'See the big picture',
      description: 'Total stock value, pending prescriptions, today\'s fulfillments — all on one screen when you log in.'
    }
  ];

  const stats = [
    { value: '248', label: 'Medicines tracked' },
    { value: '36', label: 'Prescriptions this week' },
    { value: '<1s', label: 'Load time' },
    { value: '0', label: 'Stock surprises' },
  ];

  const steps = [
    {
      number: '01',
      title: 'Add your medicines',
      description: 'Enter what you stock — names, batches, quantities, expiry dates, prices. Import in bulk or add one at a time.'
    },
    {
      number: '02',
      title: 'Fill prescriptions',
      description: 'When a prescription comes in, pick the medicines, enter quantities. The system checks stock and deducts automatically.'
    },
    {
      number: '03',
      title: 'Stay ahead of problems',
      description: 'Low stock? Expiring batch? The dashboard tells you before it becomes urgent. Reorder on your schedule, not in a panic.'
    }
  ];

  return (
    <div className="landing-page">
      {/* ── Navigation ── */}
      <nav className="landing-nav">
        <div className="logo">
          <span>PHARMACARE</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#preview">Preview</a>
          <Link to="/login" className="btn btn-primary btn-sm">Sign In</Link>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="hero-section landing-section">
        <div className="hero-inner">
          <div className="hero-label">Pharmacy Management Platform</div>
          <h1>Stop guessing<br />what's on your shelves.</h1>
          <p className="hero-subtitle">
            PharmaCare keeps your inventory accurate, your prescriptions organized,
            and your stock alerts timely — so you can focus on patients, not spreadsheets.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary btn-lg">Get Started</Link>
            <a href="#features" className="btn btn-secondary btn-lg">Learn More</a>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="stats-section">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="features-section landing-section" id="features">
        <div className="section-header">
          <h2>Features</h2>
          <p className="section-subtitle">
            The stuff that actually makes your day easier.
          </p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`feature-card ${index === 0 ? 'feature-card--highlight' : ''}`}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="how-section landing-section" id="how-it-works">
        <div className="section-header">
          <h2>How It Works</h2>
          <p className="section-subtitle">
            Three steps. No training manual required.
          </p>
        </div>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="step-number">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Product Preview ── */}
      <section className="preview-section landing-section" id="preview">
        <div className="section-header">
          <h2>Preview</h2>
          <p className="section-subtitle">
            What you'll see when you log in.
          </p>
        </div>
        <div className="preview-grid">
          <div className="preview-card">
            <div className="preview-label">Your Dashboard</div>
            <div className="preview-content">
              <div className="preview-stat-row">
                <div className="preview-stat">
                  <span className="preview-stat-number">248</span>
                  <span className="preview-stat-text">Medicines</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat-number">5</span>
                  <span className="preview-stat-text">Low Stock</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat-number">12</span>
                  <span className="preview-stat-text">Pending Rx</span>
                </div>
              </div>
            </div>
          </div>
          <div className="preview-card">
            <div className="preview-label">Inventory at a Glance</div>
            <div className="preview-content">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Amoxicillin 500mg</td>
                    <td>250</td>
                    <td><span className="status-dot status-dot--fulfilled">OK</span></td>
                  </tr>
                  <tr>
                    <td>Paracetamol 500mg</td>
                    <td>8</td>
                    <td><span className="status-dot status-dot--cancelled">Low</span></td>
                  </tr>
                  <tr>
                    <td>Omeprazole 20mg</td>
                    <td>5</td>
                    <td><span className="status-dot status-dot--cancelled">Low</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="preview-card preview-card--wide">
            <div className="preview-label">Prescription Flow</div>
            <div className="preview-flow">
              <div className="flow-step">
                <div className="flow-dot flow-dot--active" />
                <span>Created</span>
              </div>
              <div className="flow-line" />
              <div className="flow-step">
                <div className="flow-dot flow-dot--active" />
                <span>Verified</span>
              </div>
              <div className="flow-line" />
              <div className="flow-step">
                <div className="flow-dot flow-dot--active" />
                <span>Dispensed</span>
              </div>
              <div className="flow-line" />
              <div className="flow-step">
                <div className="flow-dot" />
                <span>Fulfilled</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="cta-section landing-section">
        <h2>Your pharmacy, under control.</h2>
        <p>Sign in and see your inventory in under a minute.</p>
        <Link to="/login" className="btn btn-primary btn-lg">Open Dashboard</Link>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-left">
          <span className="footer-brand">PHARMACARE</span>
          <span>&copy; 2026 All rights reserved.</span>
        </div>
        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <Link to="/login">Sign In</Link>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
