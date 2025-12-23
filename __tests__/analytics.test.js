const request = require('supertest');

jest.mock('../db', () => {
  const queryMock = jest.fn();
  const escapeMock = jest.fn((v) => `'${v}'`);
  return { connection: { query: queryMock, escape: escapeMock } };
});

const { connection } = require('../db');
const app = require('../app');

beforeEach(() => {
  connection.query.mockReset();
});

describe('GET /api/analytics/summary', () => {
  test('возвращает агрегаты и кэш-флаг', async () => {
    connection.query.mockImplementation((sql, cb) => cb(null, [{
      total: 3,
      authors: 2,
      lastUpload: '2024-01-01',
      uploads7d: 1,
    }]));

    const res = await request(app).get('/api/analytics/summary');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.metadata).toHaveProperty('generated_in_ms');
  });
});

describe('GET /api/analytics/usage', () => {
  test('возвращает сгруппированные данные с пагинацией', async () => {
    connection.query.mockImplementation((sql, cb) => cb(null, [
      { day: '2024-01-01', uploads: 2 },
    ]));

    const res = await request(app).get('/api/analytics/usage?page=1&per_page=10');

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].uploads).toBe(2);
    expect(res.body.data.per_page).toBe(10);
  });
});

describe('GET /api/analytics/popular-content', () => {
  test('возвращает топ авторов', async () => {
    connection.query.mockImplementation((sql, cb) => cb(null, [
      { author: 'Alice', uploads: 5 },
    ]));

    const res = await request(app).get('/api/analytics/popular-content?per_page=5');

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].author).toBe('Alice');
  });
});

describe('GET /api/analytics/health', () => {
  test('возвращает состояние ok', async () => {
    connection.query.mockImplementation((sql, cb) => cb(null, [{ ok: 1 }]));

    const res = await request(app).get('/api/analytics/health');

    expect(res.status).toBe(200);
    expect(res.body.data.db).toBe('ok');
  });
});

