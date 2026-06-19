/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // ── users ────────────────────────────────────────────────
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.enu('role', ['admin', 'pharmacist']).notNullable().defaultTo('pharmacist');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── suppliers ────────────────────────────────────────────
  await knex.schema.createTable('suppliers', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('contact_email');
    table.string('phone');
  });

  // ── medicines ────────────────────────────────────────────
  await knex.schema.createTable('medicines', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('sku').notNullable().unique();
    table.string('batch_no').notNullable();
    table.date('expiry_date').notNullable();
    table.integer('quantity').notNullable().defaultTo(0);
    table.integer('reorder_threshold').notNullable().defaultTo(10);
    table.decimal('unit_price', 10, 2).notNullable();
    table
      .integer('supplier_id')
      .unsigned()
      .references('id')
      .inTable('suppliers')
      .onDelete('SET NULL');
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // ── prescriptions ────────────────────────────────────────
  await knex.schema.createTable('prescriptions', (table) => {
    table.increments('id').primary();
    table.string('patient_name').notNullable();
    table.string('doctor_name').notNullable();
    table
      .enu('status', ['pending', 'fulfilled', 'cancelled'])
      .notNullable()
      .defaultTo('pending');
    table
      .integer('created_by')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── prescription_items ───────────────────────────────────
  await knex.schema.createTable('prescription_items', (table) => {
    table.increments('id').primary();
    table
      .integer('prescription_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('prescriptions')
      .onDelete('CASCADE');
    table
      .integer('medicine_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('medicines')
      .onDelete('RESTRICT');
    table.integer('quantity').notNullable();
  });

  // ── stock_transactions ───────────────────────────────────
  await knex.schema.createTable('stock_transactions', (table) => {
    table.increments('id').primary();
    table
      .integer('medicine_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('medicines')
      .onDelete('CASCADE');
    table.integer('change_qty').notNullable();
    table
      .enu('reason', ['restock', 'dispense', 'adjustment'])
      .notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('stock_transactions');
  await knex.schema.dropTableIfExists('prescription_items');
  await knex.schema.dropTableIfExists('prescriptions');
  await knex.schema.dropTableIfExists('medicines');
  await knex.schema.dropTableIfExists('suppliers');
  await knex.schema.dropTableIfExists('users');
};
