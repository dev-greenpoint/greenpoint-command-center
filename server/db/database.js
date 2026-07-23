const { Pool, types } = require('pg');

// COUNT(*) and other bigint-typed aggregates come back from pg as strings by
// default (OID 20 = int8) to avoid silent precision loss. This app's counts
// never approach Number.MAX_SAFE_INTEGER, so coerce them back to JS numbers
// app-wide.
types.setTypeParser(20, val => parseInt(val, 10));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function toPositional(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function query(sql, params = []) {
  const { rows } = await pool.query(toPositional(sql), params);
  return rows;
}

async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txQuery = async (sql, params = []) => (await client.query(toPositional(sql), params)).rows;
    const result = await fn(txQuery);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { query, transaction, pool };
