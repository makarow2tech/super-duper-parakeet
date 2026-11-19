// Depolama katmanı. Dört arka uç, tek arayüz:
//   SqlStore  → SQLite (better-sqlite3) · MySQL/MariaDB (mysql2) · Supabase/PostgreSQL (pg), tek `records` tablosu
//   RtdbStore → Firebase Realtime Database, /<koleksiyon>/<id> = belge
// Belgeler düz nesnedir: id, created_date, updated_date, created_by_id + alanlar.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  DATA_DIR,
  DATABASE_SSL,
  DATABASE_URL,
  DB_BACKEND,
  dbConfigError,
  FIREBASE_CREDENTIALS,
  FIREBASE_DATABASE_URL,
  FIREBASE_PROJECT_ID,
  SERVER_DIR,
} from "./config.js";
import { matches, sortDocs } from "./query.js";

export function nowIso() {
  return new Date().toISOString();
}

export function newId() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 24);
}

// ------------------------------------------------------------------ SQL
function sqliteFilename(url) {
  let rest = url.replace(/^sqlite:/, "");

  if (rest.startsWith("////")) rest = rest.slice(3); // sqlite:////abs/yol.db → mutlak yol
  else if (rest.startsWith("///")) rest = rest.slice(3); // sqlite:///./data/krypt.db → göreli yol
  else if (rest.startsWith("//")) rest = rest.slice(2);
  else if (rest.startsWith("/")) rest = rest.slice(1);

  if (!rest || rest === ":memory:") return rest || ":memory:";

  const filename = path.isAbsolute(rest) ? rest : path.resolve(SERVER_DIR, rest);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  return filename;
}

function sqlConfig(url) {
  if (DB_BACKEND === "sqlite" || url.startsWith("sqlite:")) {
    return {
      client: "better-sqlite3",
      connection: { filename: sqliteFilename(url) },
      useNullAsDefault: true,
      pool: { min: 1, max: 1 },
    };
  }

  if (DB_BACKEND === "mysql") {
    return { client: "mysql2", connection: url, pool: { min: 0, max: 10 } };
  }

  // Supabase / PostgreSQL
  return {
    client: "pg",
    connection: DATABASE_SSL ? { connectionString: url, ssl: { rejectUnauthorized: false } } : url,
    pool: { min: 0, max: 10 },
  };
}

function readRow(row) {
  if (!row) return null;
  const raw = row.data;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw ?? {};
  return { ...parsed, id: row.id };
}

export class SqlStore {
  constructor(url = DATABASE_URL) {
    this.kind = "sql";
    this.config = sqlConfig(url);
  }

  async init() {
    const { default: knex } = await import("knex");
    this.db = knex(this.config);
    this.isSqlite = this.config.client === "better-sqlite3";

    const exists = await this.db.schema.hasTable("records");
    if (!exists) {
      await this.db.schema.createTable("records", (table) => {
        table.string("id", 24).primary();
        table.string("collection", 40).notNullable();
        table.string("created_date", 30).notNullable();
        // Şifreli mesaj blokları 200 KB'a kadar çıkabilir: MySQL'de mediumtext gerekir.
        table.text("data", "mediumtext").notNullable();
        table.index(["collection", "created_date"], "ix_records_coll_created");
      });
    }

    if (this.isSqlite) {
      await this.db.raw("PRAGMA journal_mode = WAL");
      await this.db.raw("PRAGMA busy_timeout = 5000");
    }
    return this;
  }

  async all(collection) {
    const rows = await this.db("records").where({ collection }).select("id", "data");
    return rows.map(readRow);
  }

  async create(collection, doc) {
    const { id: incoming, ...rest } = doc;
    const id = incoming || newId();
    await this.db("records").insert({
      id,
      collection,
      created_date: rest.created_date || nowIso(),
      data: JSON.stringify(rest),
    });
    return { ...rest, id };
  }

  async get(collection, id) {
    const row = await this.db("records").where({ id }).first();
    return row && row.collection === collection ? readRow(row) : null;
  }

  async find(collection, query = {}, sort = "-created_date", limit = 50, skip = 0) {
    const docs = (await this.all(collection)).filter((doc) => matches(doc, query));
    return sortDocs(docs, sort).slice(skip, skip + limit);
  }

  async count(collection, query = {}) {
    return (await this.all(collection)).filter((doc) => matches(doc, query)).length;
  }

  async update(collection, id, patch) {
    const row = await this.db("records").where({ id }).first();
    if (!row || row.collection !== collection) return null;

    const current = readRow(row);
    const { id: _ignored, ...currentFields } = current;
    const { id: _patchId, ...patchFields } = patch;
    const data = { ...currentFields, ...patchFields };

    await this.db("records").where({ id }).update({ data: JSON.stringify(data) });
    return { ...data, id };
  }

  async delete(collection, id) {
    return (await this.db("records").where({ id, collection }).del()) > 0;
  }

  async close() {
    await this.db?.destroy();
  }
}

// ------------------------------------------------------------------ Firebase RTDB
const RTDB_ARRAYS = { Channel: ["members"] };

function firebaseCredential(raw) {
  if (!raw) return null;
  if (raw.trim().startsWith("{")) return JSON.parse(raw); // yol yerine JSON verilebilir
  return JSON.parse(fs.readFileSync(path.resolve(SERVER_DIR, raw), "utf8"));
}

export class RtdbStore {
  constructor({
    credentials = FIREBASE_CREDENTIALS,
    databaseUrl = FIREBASE_DATABASE_URL,
    projectId = FIREBASE_PROJECT_ID,
  } = {}) {
    this.kind = "firebase";
    this.credentials = credentials;
    this.databaseUrl = databaseUrl;
    this.projectId = projectId;
  }

  async init() {
    if (!this.databaseUrl) {
      throw new Error(
        "FIREBASE_DATABASE_URL gerekli (örn. https://PROJE-default-rtdb.firebaseio.com). `npm run setup` ile ayarlayabilirsin.",
      );
    }

    const { initializeApp, cert, applicationDefault, getApps } = await import("firebase-admin/app");
    const { getDatabase } = await import("firebase-admin/database");

    if (getApps().length === 0) {
      const serviceAccount = firebaseCredential(this.credentials);
      const options = { databaseURL: this.databaseUrl };
      if (this.projectId) options.projectId = this.projectId;
      initializeApp(serviceAccount ? cert(serviceAccount) : applicationDefault(), options);
    }

    this.root = getDatabase().ref("/");
    return this;
  }

  ref(collection, id) {
    return this.root.child(id ? `${collection}/${id}` : collection);
  }

  shape(collection, id, value) {
    const doc = { ...(value || {}), id };
    for (const field of RTDB_ARRAYS[collection] || []) {
      if (!Array.isArray(doc[field])) doc[field] = doc[field] ? Object.values(doc[field]) : [];
    }
    return doc;
  }

  async all(collection) {
    const value = (await this.ref(collection).get()).val() || {};
    return Object.entries(value)
      .filter(([, doc]) => doc && typeof doc === "object")
      .map(([id, doc]) => this.shape(collection, id, doc));
  }

  async create(collection, doc) {
    const { id: incoming, ...rest } = doc;
    const id = incoming || newId();
    await this.ref(collection, id).set(rest);
    return this.shape(collection, id, rest);
  }

  async get(collection, id) {
    const value = (await this.ref(collection, id).get()).val();
    return value ? this.shape(collection, id, value) : null;
  }

  async find(collection, query = {}, sort = "-created_date", limit = 50, skip = 0) {
    const docs = (await this.all(collection)).filter((doc) => matches(doc, query));
    return sortDocs(docs, sort).slice(skip, skip + limit);
  }

  async count(collection, query = {}) {
    return (await this.all(collection)).filter((doc) => matches(doc, query)).length;
  }

  async update(collection, id, patch) {
    const ref = this.ref(collection, id);
    const existing = (await ref.get()).val();
    if (!existing) return null;

    const { id: _ignored, ...fields } = patch;
    await ref.update(fields);
    const next = (await ref.get()).val();
    return this.shape(collection, id, next);
  }

  async delete(collection, id) {
    const ref = this.ref(collection, id);
    if (!(await ref.get()).exists()) return false;
    await ref.remove();
    return true;
  }

  async close() {}
}

// ------------------------------------------------------------------ Seçim
let instance = null;

export function makeStore(options = {}) {
  return DB_BACKEND === "firebase" ? new RtdbStore(options) : new SqlStore(options.url);
}

export async function getStore() {
  if (!instance) {
    // Eksik/hatalı .env ayarı varsa ilk istekte değil, açılışta anlaşılır hata ver.
    const problem = dbConfigError();
    if (problem) throw new Error(problem);
    instance = await makeStore().init();
  }
  return instance;
}

export async function closeStore() {
  await instance?.close();
  instance = null;
}

export { DATA_DIR };
