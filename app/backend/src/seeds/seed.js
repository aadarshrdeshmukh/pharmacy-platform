const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // ── Clear existing data (in reverse FK order) ────────────
  await knex('stock_transactions').del();
  await knex('prescription_items').del();
  await knex('prescriptions').del();
  await knex('medicines').del();
  await knex('suppliers').del();
  await knex('users').del();

  // ── Users ────────────────────────────────────────────────
  const salt = await bcrypt.genSalt(12);
  const adminHash = await bcrypt.hash('admin123', salt);
  const pharmacistHash = await bcrypt.hash('pharma123', salt);

  // MySQL doesn't support .returning(), so we use insert + select
  await knex('users').insert([
    {
      name: 'Admin User',
      email: 'admin@pharmacy.com',
      password_hash: adminHash,
      role: 'admin',
    },
    {
      name: 'Jane Pharmacist',
      email: 'jane@pharmacy.com',
      password_hash: pharmacistHash,
      role: 'pharmacist',
    },
  ]);

  const adminUser = await knex('users').where({ email: 'admin@pharmacy.com' }).first();

  // ── Suppliers ────────────────────────────────────────────
  await knex('suppliers').insert([
    {
      name: 'PharmaCorp International',
      contact_email: 'orders@pharmacorp.com',
      phone: '+1-555-0101',
    },
    {
      name: 'MedSupply Direct',
      contact_email: 'sales@medsupply.com',
      phone: '+1-555-0202',
    },
    {
      name: 'GlobalHealth Distributors',
      contact_email: 'supply@globalhealth.com',
      phone: '+1-555-0303',
    },
  ]);

  const suppliers = await knex('suppliers').orderBy('id', 'asc');
  const [supplier1, supplier2, supplier3] = suppliers;

  // ── Medicines ────────────────────────────────────────────
  await knex('medicines').insert([
    {
      name: 'Amoxicillin 500mg',
      sku: 'AMX-500',
      batch_no: 'B2024-001',
      expiry_date: '2026-12-31',
      quantity: 250,
      reorder_threshold: 50,
      unit_price: 0.45,
      supplier_id: supplier1.id,
    },
    {
      name: 'Ibuprofen 200mg',
      sku: 'IBU-200',
      batch_no: 'B2024-002',
      expiry_date: '2027-06-30',
      quantity: 500,
      reorder_threshold: 100,
      unit_price: 0.12,
      supplier_id: supplier1.id,
    },
    {
      name: 'Paracetamol 500mg',
      sku: 'PCM-500',
      batch_no: 'B2024-003',
      expiry_date: '2027-03-15',
      quantity: 8,
      reorder_threshold: 100,
      unit_price: 0.08,
      supplier_id: supplier2.id,
    },
    {
      name: 'Metformin 850mg',
      sku: 'MET-850',
      batch_no: 'B2024-004',
      expiry_date: '2026-09-30',
      quantity: 300,
      reorder_threshold: 60,
      unit_price: 0.35,
      supplier_id: supplier2.id,
    },
    {
      name: 'Omeprazole 20mg',
      sku: 'OMP-020',
      batch_no: 'B2024-005',
      expiry_date: '2026-11-15',
      quantity: 5,
      reorder_threshold: 40,
      unit_price: 0.55,
      supplier_id: supplier3.id,
    },
    {
      name: 'Ciprofloxacin 250mg',
      sku: 'CIP-250',
      batch_no: 'B2024-006',
      expiry_date: '2027-01-20',
      quantity: 180,
      reorder_threshold: 30,
      unit_price: 0.60,
      supplier_id: supplier1.id,
    },
    {
      name: 'Amlodipine 5mg',
      sku: 'AML-005',
      batch_no: 'B2024-007',
      expiry_date: '2027-08-10',
      quantity: 3,
      reorder_threshold: 25,
      unit_price: 0.40,
      supplier_id: supplier3.id,
    },
    {
      name: 'Lisinopril 10mg',
      sku: 'LIS-010',
      batch_no: 'B2024-008',
      expiry_date: '2027-04-25',
      quantity: 200,
      reorder_threshold: 40,
      unit_price: 0.30,
      supplier_id: supplier2.id,
    },
    {
      name: 'Azithromycin 250mg',
      sku: 'AZI-250',
      batch_no: 'B2024-009',
      expiry_date: '2026-10-05',
      quantity: 7,
      reorder_threshold: 20,
      unit_price: 1.20,
      supplier_id: supplier1.id,
    },
    {
      name: 'Cetirizine 10mg',
      sku: 'CET-010',
      batch_no: 'B2024-010',
      expiry_date: '2027-12-31',
      quantity: 400,
      reorder_threshold: 50,
      unit_price: 0.15,
      supplier_id: supplier3.id,
    },
    {
      name: 'Losartan 50mg',
      sku: 'LOS-050',
      batch_no: 'B2024-011',
      expiry_date: '2027-05-18',
      quantity: 150,
      reorder_threshold: 35,
      unit_price: 0.48,
      supplier_id: supplier2.id,
    },
    {
      name: 'Salbutamol Inhaler 100mcg',
      sku: 'SAL-100',
      batch_no: 'B2024-012',
      expiry_date: '2026-08-20',
      quantity: 2,
      reorder_threshold: 15,
      unit_price: 3.50,
      supplier_id: supplier3.id,
    },
  ]);

  const medicines = await knex('medicines').orderBy('id', 'asc');

  // ── Prescriptions with items ─────────────────────────────
  const [rx1Id] = await knex('prescriptions').insert({
    patient_name: 'John Doe',
    doctor_name: 'Dr. Sarah Smith',
    status: 'fulfilled',
    created_by: adminUser.id,
  });

  await knex('prescription_items').insert([
    { prescription_id: rx1Id, medicine_id: medicines[0].id, quantity: 21 },
    { prescription_id: rx1Id, medicine_id: medicines[1].id, quantity: 30 },
  ]);

  await knex('stock_transactions').insert([
    { medicine_id: medicines[0].id, change_qty: -21, reason: 'dispense' },
    { medicine_id: medicines[1].id, change_qty: -30, reason: 'dispense' },
  ]);

  const [rx2Id] = await knex('prescriptions').insert({
    patient_name: 'Alice Johnson',
    doctor_name: 'Dr. Michael Brown',
    status: 'pending',
    created_by: adminUser.id,
  });

  await knex('prescription_items').insert([
    { prescription_id: rx2Id, medicine_id: medicines[3].id, quantity: 60 },
    { prescription_id: rx2Id, medicine_id: medicines[4].id, quantity: 14 },
  ]);

  await knex('stock_transactions').insert([
    { medicine_id: medicines[3].id, change_qty: -60, reason: 'dispense' },
    { medicine_id: medicines[4].id, change_qty: -14, reason: 'dispense' },
  ]);

  const [rx3Id] = await knex('prescriptions').insert({
    patient_name: 'Bob Williams',
    doctor_name: 'Dr. Sarah Smith',
    status: 'pending',
    created_by: adminUser.id,
  });

  await knex('prescription_items').insert([
    { prescription_id: rx3Id, medicine_id: medicines[5].id, quantity: 10 },
  ]);

  await knex('stock_transactions').insert([
    { medicine_id: medicines[5].id, change_qty: -10, reason: 'dispense' },
  ]);

  // Add a couple of restock transactions
  await knex('stock_transactions').insert([
    { medicine_id: medicines[0].id, change_qty: 500, reason: 'restock' },
    { medicine_id: medicines[9].id, change_qty: 200, reason: 'restock' },
  ]);
};
