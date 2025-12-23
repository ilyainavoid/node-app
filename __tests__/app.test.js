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
    expect(res.body).toEqual(rows);
    expect(connection.query).toHaveBeenCalledWith('SELECT * from data', expect.any(Function));
  });

  test('отдаёт 500 при ошибке БД', async () => {
    connection.query.mockImplementation((sql, cb) => cb(new Error('db error')));

    const res = await request(app).get('/all');

    expect(res.status).toBe(500);
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
    expect(res.text).toBe('fixed-uuid.png');
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    expect(connection.query).toHaveBeenCalled();
    expect(connection.query.mock.calls[0][0]).toContain('INSERT INTO data');
  });

  test('возвращает 400 если нет файла', async () => {
    const res = await request(app)
      .post('/new')
      .field('name', 'n');

    expect(res.status).toBe(400);
  });

  test('возвращает 500 если БД упала', async () => {
    connection.query.mockImplementation(() => { throw new Error('db fail'); });

    const res = await request(app)
      .post('/new')
      .attach('image', Buffer.from('fakeimg'), 'image.png')
      .field('name', 'n');

    expect(res.status).toBe(500);
  });
});

