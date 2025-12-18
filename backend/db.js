const tokensStore = [];
const accessKeyStore = [];
const resourceStore = new Map();
const filterStore = new Map();

const tokens = {
  add(token, type = 'admin', expiresAt = null) {
    const existing = tokensStore.find((t) => t.token === token);
    if (existing) return false;
    tokensStore.push({ token, type, created_at: Date.now(), expires_at: expiresAt });
    return true;
  },
  verify(token) {
    const now = Date.now();
    const row = tokensStore.find((t) => t.token === token && (!t.expires_at || t.expires_at > now));
    return !!row;
  },
  getType(token) {
    const now = Date.now();
    const row = tokensStore.find((t) => t.token === token && (!t.expires_at || t.expires_at > now));
    return row ? row.type : null;
  },
  isAdmin(token) {
    return this.getType(token) === 'admin';
  },
  delete(token) {
    const idx = tokensStore.findIndex((t) => t.token === token);
    if (idx >= 0) {
      tokensStore.splice(idx, 1);
      return true;
    }
    return false;
  },
  cleanup() {
    const now = Date.now();
    let removed = 0;
    for (let i = tokensStore.length - 1; i >= 0; i--) {
      const t = tokensStore[i];
      if (t.expires_at && t.expires_at < now) {
        tokensStore.splice(i, 1);
        removed++;
      }
    }
    return removed;
  },
};

const accessKeys = {
  add(code, username, durationInDays) {
    const now = Date.now();
    const expiresAt = now + durationInDays * 24 * 60 * 60 * 1000;
    const existing = accessKeyStore.find((k) => k.code === code.toUpperCase());
    if (existing) return null;
    const row = { code: code.toUpperCase(), username, name: null, duration: durationInDays, created_at: now, expires_at: expiresAt };
    accessKeyStore.push(row);
    return { code: row.code, username: row.username, duration: row.duration, createdAt: row.created_at, expiresAt: row.expires_at };
  },
  findByCode(code) {
    const row = accessKeyStore.find((k) => k.code === code.trim().toUpperCase());
    return row || null;
  },
  getAll() {
    const now = Date.now();
    return accessKeyStore.filter((k) => k.expires_at > now).map((row) => ({
      code: row.code,
      username: row.username,
      name: row.name,
      duration: row.duration,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));
  },
  delete(code) {
    const idx = accessKeyStore.findIndex((k) => k.code === code);
    if (idx >= 0) {
      accessKeyStore.splice(idx, 1);
      return true;
    }
    return false;
  },
  updateName(code, name) {
    const row = accessKeyStore.find((k) => k.code === code);
    if (!row) return null;
    row.name = name;
    return this.findByCode(code);
  },
  isExpired(key) {
    return Date.now() > key.expires_at;
  },
  cleanup() {
    const now = Date.now();
    let removed = 0;
    for (let i = accessKeyStore.length - 1; i >= 0; i--) {
      const k = accessKeyStore[i];
      if (k.expires_at < now) {
        accessKeyStore.splice(i, 1);
        removed++;
      }
    }
    return removed;
  },
};

const resources = {
  upsert(resource) {
    const now = Date.now();
    const existing = resourceStore.get(resource.id) || {};
    const row = {
      id: resource.id,
      title: resource.title,
      description: resource.description || '',
      category: resource.category,
      tags: JSON.stringify(resource.tags || []),
      image_url: resource.imageUrl || resource.image_url || '',
      link: resource.link || '',
      featured: resource.featured ? 1 : 0,
      sort_order: resource.sortOrder || resource.sort_order || 0,
      created_at: existing.created_at || resource.createdAt || now,
      updated_at: now,
    };
    resourceStore.set(resource.id, row);
    return true;
  },
  upsertMany(items) {
    let count = 0;
    for (const item of items) {
      if (this.upsert(item)) count++;
    }
    return count;
  },
  getByCategory(category) {
    return Array.from(resourceStore.values())
      .filter((r) => r.category === category)
      .sort((a, b) => (b.featured - a.featured) || (b.created_at - a.created_at) || a.title.localeCompare(b.title))
      .map(this._mapRow);
  },
  getAll() {
    return Array.from(resourceStore.values())
      .sort((a, b) => a.category.localeCompare(b.category) || (b.featured - a.featured) || (b.created_at - a.created_at) || a.title.localeCompare(b.title))
      .map(this._mapRow);
  },
  getById(id) {
    const row = resourceStore.get(id);
    return row ? this._mapRow(row) : null;
  },
  delete(id) {
    return resourceStore.delete(id);
  },
  deleteByCategory(category) {
    let removed = 0;
    for (const [id, row] of resourceStore.entries()) {
      if (row.category === category) {
        resourceStore.delete(id);
        removed++;
      }
    }
    return removed;
  },
  _mapRow(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      tags: JSON.parse(row.tags || '[]'),
      imageUrl: row.image_url,
      link: row.link,
      featured: row.featured === 1,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

const filters = {
  upsert(category, label, tag, sortOrder = 0) {
    const list = filterStore.get(category) || [];
    const idx = list.findIndex((f) => f.tag === tag);
    if (idx >= 0) {
      list[idx] = { category, label, tag, sort_order: sortOrder };
    } else {
      list.push({ category, label, tag, sort_order: sortOrder });
    }
    filterStore.set(category, list);
    return true;
  },
  upsertMany(items, category) {
    for (let i = 0; i < items.length; i++) {
      this.upsert(category, items[i].label, items[i].tag, i);
    }
    return items.length;
  },
  getByCategory(category) {
    const list = filterStore.get(category) || [];
    return list
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => ({ label: row.label, tag: row.tag }));
  },
  getAll() {
    const result = {};
    for (const [cat, list] of filterStore.entries()) {
      result[cat] = list
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => ({ label: row.label, tag: row.tag }));
    }
    return result;
  },
  delete(category, tag) {
    const list = filterStore.get(category) || [];
    const idx = list.findIndex((f) => f.tag === tag);
    if (idx >= 0) {
      list.splice(idx, 1);
      filterStore.set(category, list);
      return true;
    }
    return false;
  },
  deleteByCategory(category) {
    const list = filterStore.get(category) || [];
    const count = list.length;
    filterStore.delete(category);
    return count;
  },
};

setInterval(() => {
  tokens.cleanup();
  accessKeys.cleanup();
}, 60 * 60 * 1000);

module.exports = {
  db: null,
  tokens,
  accessKeys,
  resources,
  filters,
};
