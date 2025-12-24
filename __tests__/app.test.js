const request = require('supertest');
const fs = require('fs');

// Мокаем модуль работы с БД до импорта приложения
jest.mock('../db', () => {
  const queryMock = jest.fn();
  return { connection: { query: queryMock } };
});

// Фиксируем uuid, чтобы предсказуемо проверять имя файла
jest.mock('uuid', () => ({ v4: () => 'fixed-uuid' }));

const { connection } = require('../db');
const app = require('../app');

let writeFileSpy;

beforeEach(() => {
  connection.query.mockReset();
  writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
});

afterEach(() => {
  writeFileSpy.mockRestore();
});

describe('GET /all', () => {
  test('возвращает строки из БД со статусом 200', async () => {
    const rows = [{ id: 1, name: 'demo', author: 'test' }];
    connection.query.mockImplementation((sql, cb) => cb(null, rows));

    const res = await request(app).get('/all');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual(rows);
    expect(res.body.data.total).toBe(rows.length);
    expect(res.body.metadata).toHaveProperty('generated_in_ms');
    expect(connection.query).toHaveBeenCalledWith('SELECT * from data', expect.any(Function));
  });

  test('отдаёт 500 при ошибке БД', async () => {
    connection.query.mockImplementation((sql, cb) => cb(new Error('db error')));

    const res = await request(app).get('/all');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /', () => {
  test('рендерит главную страницу', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('PhotoGallery');
  });
});

describe('POST /new', () => {
  test('сохраняет файл и записывает в БД', async () => {
    connection.query.mockImplementation((sql, cb) => cb(null, {}));

    const res = await request(app)
      .post('/new')
      .attach('image', Buffer.from('fakeimg'), 'image.png')
      .field('name', 'n')
      .field('description', 'd')
      .field('author', 'a');

    expect(res.status).toBe(200);
    expect(res.body.data.fileName).toBe('fixed-uuid.png');
    expect(res.body.metadata).toHaveProperty('generated_in_ms');
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    expect(connection.query).toHaveBeenCalled();
    expect(connection.query.mock.calls[0][0]).toContain('INSERT INTO data');
  });

  test('возвращает 400 если нет файла', async () => {
    const res = await request(app)
      .post('/new')
      .field('name', 'n');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('image required');
  });

  test('возвращает 500 если БД упала', async () => {
    connection.query.mockImplementation(() => { throw new Error('db fail'); });

    const res = await request(app)
      .post('/new')
      .attach('image', Buffer.from('fakeimg'), 'image.png')
      .field('name', 'n');

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('db fail');
  });
});

