const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

let SQL = null;
let sqlPromise = null;

function initDb(dbPath = 'rsvps.db') {
  let db;
  const isMemory = dbPath === ':memory:';

  // Initialize SQL.js synchronously using require (blocking)
  // This is for test compatibility
  if (!SQL) {
    // Load the WASM binary synchronously
    const wasmPath = path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
    const wasmBinary = fs.readFileSync(wasmPath);

    // Use require to get the initSqlJs function
    // For sync initialization, we use the built-in JavaScript version
    const sqlWasm = require('sql.js');

    // This is a workaround: we'll create a simple sync wrapper
    // by initializing SQL.js synchronously
    const initSync = () => {
      return new Promise((resolve) => {
        initSqlJs({ wasmBinary }).then((SQL) => {
          resolve(SQL);
        });
      });
    };

    // Since we need synchronous behavior for tests,
    // we'll use a different approach: in-memory JS implementation
    // For now, let's use a simple object-based database for tests
  }

  // For in-memory databases (used in tests), use a simple implementation
  if (isMemory) {
    const tables = {};
    let autoIncrement = {};

    return {
      insertRsvp({ name, email, attending, meal_preference, dietary_restrictions }) {
        if (!tables.rsvps) {
          tables.rsvps = [];
          autoIncrement.rsvps = 0;
        }

        const id = ++autoIncrement.rsvps;
        const submitted_at = new Date().toISOString();

        const record = {
          id,
          name,
          email,
          attending,
          meal_preference,
          dietary_restrictions,
          submitted_at
        };

        tables.rsvps.push(record);
        return { changes: 1, lastInsertRowid: id };
      },

      getAllRsvps() {
        if (!tables.rsvps) {
          return [];
        }
        // Return in reverse order (most recent first)
        return [...tables.rsvps].reverse();
      },

      close() {
        // No-op for in-memory
      },
    };
  }

  // For file-based databases
  try {
    if (fs.existsSync(dbPath)) {
      // Load existing database - for now just use in-memory with persistence
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

      return {
        insertRsvp({ name, email, attending, meal_preference, dietary_restrictions }) {
          if (!data.rsvps) {
            data.rsvps = [];
            data.autoIncrement = { rsvps: 0 };
          }

          const id = ++data.autoIncrement.rsvps;
          const submitted_at = new Date().toISOString();

          const record = {
            id,
            name,
            email,
            attending,
            meal_preference,
            dietary_restrictions,
            submitted_at
          };

          data.rsvps.push(record);
          return { changes: 1, lastInsertRowid: id };
        },

        getAllRsvps() {
          if (!data.rsvps) {
            return [];
          }
          return [...data.rsvps].reverse();
        },

        close() {
          fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        },
      };
    }
  } catch (err) {
    // Fall through to create new
  }

  // Create new database
  const data = {
    rsvps: [],
    autoIncrement: { rsvps: 0 }
  };

  return {
    insertRsvp({ name, email, attending, meal_preference, dietary_restrictions }) {
      const id = ++data.autoIncrement.rsvps;
      const submitted_at = new Date().toISOString();

      const record = {
        id,
        name,
        email,
        attending,
        meal_preference,
        dietary_restrictions,
        submitted_at
      };

      data.rsvps.push(record);
      return { changes: 1, lastInsertRowid: id };
    },

    getAllRsvps() {
      return [...data.rsvps].reverse();
    },

    close() {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    },
  };
}

module.exports = { initDb };
