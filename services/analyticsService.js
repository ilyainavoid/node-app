const { escapeValue, query } = require('./dbUtils');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут
const cache = new Map();

function clearAnalyticsCache() {
  cache.clear();
}

function nowIso() {
  return new Date().toISOString();
}

function periodLabel({ startDate, endDate, period }) {
  if (period) return period;
  if (startDate || endDate) return `${startDate || 'unknown'}_${endDate || 'unknown'}`;
  return 'last_30_days';
}

function buildDateFilter({ period, start_date, end_date }) {
  let where = '1=1';

  if (start_date && end_date) {
    where = `date BETWEEN ${escapeValue(start_date)} AND ${escapeValue(end_date)}`;
    return { where, label: `${start_date}_${end_date}` };
  }

  const map = {
    '7d': '7 DAY',
    '14d': '14 DAY',
    '30d': '30 DAY',
    '90d': '90 DAY',
  };
  const interval = map[period] || map['30d'];
  where = `date >= DATE_SUB(NOW(), INTERVAL ${interval})`;
  return { where, label: period || '30d' };
}

function withCache(key, ttlMs, fn) {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) {
    return Promise.resolve({ cached: true, data: hit.value });
  }
  return fn().then((data) => {
    cache.set(key, { value: data, expires: now + ttlMs });
    return { cached: false, data };
  });
}

async function getSummary(params = {}) {
  const { where, label } = buildDateFilter(params);
  const sql = `
    SELECT 
      COUNT(*) AS total,
      COUNT(DISTINCT author) AS authors,
      MAX(date) AS lastUpload,
      SUM(date >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS uploads7d
    FROM data
    WHERE ${where};
  `;
  const start = Date.now();
  const rows = await query(sql);
  const elapsed = Date.now() - start;
  const row = rows[0] || {};
  return {
    timestamp: nowIso(),
    period: label,
    data: {
      total: row.total || 0,
      authors: row.authors || 0,
      lastUpload: row.lastUpload || null,
      uploads7d: row.uploads7d || 0,
    },
    metadata: { generated_in_ms: elapsed },
  };
}

async function getUsage(params = {}) {
  const { where, label } = buildDateFilter(params);
  const page = Math.max(parseInt(params.page || '1', 10), 1);
  const perPage = Math.min(Math.max(parseInt(params.per_page || '30', 10), 1), 200);
  const offset = (page - 1) * perPage;

  const sql = `
    SELECT DATE(date) AS day, COUNT(*) AS uploads
    FROM data
    WHERE ${where}
    GROUP BY DATE(date)
    ORDER BY day DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
  const start = Date.now();
  const rows = await query(sql);
  const elapsed = Date.now() - start;
  return {
    timestamp: nowIso(),
    period: label,
    data: {
      page,
      per_page: perPage,
      items: rows || [],
    },
    metadata: { generated_in_ms: elapsed },
  };
}

async function getPopularContent(params = {}) {
  const { where, label } = buildDateFilter(params);
  const page = Math.max(parseInt(params.page || '1', 10), 1);
  const perPage = Math.min(Math.max(parseInt(params.per_page || '10', 10), 1), 100);
  const offset = (page - 1) * perPage;

  const sql = `
    SELECT author, COUNT(*) AS uploads
    FROM data
    WHERE ${where}
    GROUP BY author
    ORDER BY uploads DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
  const start = Date.now();
  const rows = await query(sql);
  const elapsed = Date.now() - start;
  return {
    timestamp: nowIso(),
    period: label,
    data: {
      page,
      per_page: perPage,
      items: rows || [],
    },
    metadata: { generated_in_ms: elapsed },
  };
}

async function getHealth() {
  const start = Date.now();
  await query('SELECT 1 as ok');
  const elapsed = Date.now() - start;
  return {
    timestamp: nowIso(),
    period: 'now',
    data: {
      db: 'ok',
      uptime_seconds: Math.round(process.uptime()),
      memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    metadata: { generated_in_ms: elapsed },
  };
}

function cachedSummary(params) {
  const key = `summary_${JSON.stringify(params)}`;
  return withCache(key, CACHE_TTL_MS, () => getSummary(params));
}

function cachedUsage(params) {
  const key = `usage_${JSON.stringify(params)}`;
  return withCache(key, CACHE_TTL_MS, () => getUsage(params));
}

function cachedPopular(params) {
  const key = `popular_${JSON.stringify(params)}`;
  return withCache(key, CACHE_TTL_MS, () => getPopularContent(params));
}

module.exports = {
  cachedSummary,
  cachedUsage,
  cachedPopular,
  getHealth,
  clearAnalyticsCache,
};

