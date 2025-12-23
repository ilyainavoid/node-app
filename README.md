# node-app — фотогалерея на Express + MySQL

## Архитектура
- Node.js + Express, шаблонизатор Pug.
- Хранение файлов: локально в `public/images`.
- Метаданные: таблица `data` в MySQL (`init.sql` создаёт структуру).
- Загрузки: `express-form-data` (multipart/form-data).
- UUID для имён файлов, статика отдаётся из `public`.

## Требования
- Node.js 20+
- npm
- MySQL 8 (или совместимый)
- Docker / Docker Compose (опционально)

## Локальный запуск (без Docker)
1) Установите зависимости: `npm install`
2) Поднимите MySQL, создайте БД `db`, пользователя `mysql/mysql` (или измените настройки).
3) Выполните `init.sql` в вашей БД.
4) Запустите: `npm start`
5) Откройте: http://localhost:3000

## Запуск в Docker / Compose
1) Убедитесь, что Docker Desktop запущен.
2) Соберите и поднимите:
   - `docker compose build`
   - `docker compose up -d`
3) Приложение: http://localhost:3000  
   БД: сервис `db` (порт 3306 внутри сети Compose).

Примечания:
- В Compose `db.js` должен читать хост из переменных (`DB_HOST=db` и т.п.). Проверьте, что в коде используется env или поменяйте хост на `db`.

## Аналитические эндпоинты (GET)
Базовый путь: `/api/analytics`

- `/summary` — агрегаты по данным (total, authors, lastUpload, uploads7d). Параметры: `period=7d|14d|30d|90d` или `start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`. Кэш 5 мин.
- `/usage` — загрузки по дням с пагинацией. Параметры: `period`/`start_date`+`end_date`, `page`, `per_page` (по умолчанию 30). Кэш 5 мин.
- `/popular-content` — топ авторов по количеству загрузок. Параметры: `period`/`start_date`+`end_date`, `page`, `per_page` (по умолчанию 10). Кэш 5 мин.
- `/health` — health-check: статус БД, uptime, память. Без кэша.

Пример ответа:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "period": "30d",
  "data": {
    "total": 123,
    "authors": 10,
    "uploads7d": 12,
    "lastUpload": "2024-01-14T12:00:00Z"
  },
  "metadata": {
    "generated_in_ms": 45,
    "cached": true
  }
}
```

## Переменные окружения (пример)
DB_HOST=db
DB_USER=mysql
DB_PASSWORD=mysql
DB_NAME=db


## Структура
- `app.js` — инициализация Express, middleware, статика.
- `routes/index.js` — основные маршруты загрузки/выдачи.
- `db.js` — подключение к MySQL.
- `init.sql` — схема таблицы `data`.
- `public/` — статика (в т.ч. `images/` для загруженных файлов).
- `views/` — Pug-шаблоны.

## API (основные маршруты)
- `GET /` — страница галереи.
- `POST /new` — загрузка изображения.
  - multipart/form-data
  - файл: `image`
  - поля: `name`, `description`, `author`
  - Результат: имя сохранённого файла (строка).
- `GET /all` — список всех записей (JSON).

## Тестирование/проверка
- `curl http://localhost:3000/all`
- `curl -F "image=@C:\path\to\pic.jpg" -F "name=Title" -F "description=Desc" -F "author=Me" http://localhost:3000/new`
- `npm test`

## Безопасность и права
- Образ Docker использует встроенного пользователя `node` (non-root).
- Статика доступна из `public`; следите за правами на `public/images`.