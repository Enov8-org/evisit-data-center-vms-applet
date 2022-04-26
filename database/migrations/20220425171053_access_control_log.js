/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex, Promise) {
  return knex.schema.createTable("access_control_log", function (t) {
    t.increments("id").unsigned().primary();
    t.string("visitor_token").notNull();
    t.string("key_card").notNull();
    t.string("access_points").notNull();
    t.boolean("is_active").defaultTo(true);
    t.dateTime("time_checked_in").notNull();
    t.dateTime("time_checked_out");
    t.string("admin_id");
    t.string("admin_name");
    t.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("access_control_log");
};
