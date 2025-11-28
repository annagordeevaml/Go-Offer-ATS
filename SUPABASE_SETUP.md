# Настройка Supabase для аутентификации и мультитенантности

## 1. Включение Supabase Auth

В панели Supabase:
1. Перейдите в **Authentication** → **Providers**
2. Включите **Email** provider
3. (Опционально) Настройте email templates для подтверждения регистрации

## 2. Структура таблицы `jobs`

Создайте таблицу `jobs` в Supabase со следующими полями:

```sql
CREATE TABLE jobs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  posted_date TEXT,
  match_count INTEGER DEFAULT 0,
  skills TEXT[],
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'closed')),
  company_name TEXT,
  industry TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX idx_jobs_user_id ON jobs(user_id);

-- Индекс для фильтрации по статусу
CREATE INDEX idx_jobs_status ON jobs(status);
```

## 3. Row Level Security (RLS) политики

**ВАЖНО:** RLS политики обеспечивают безопасность на уровне базы данных. Рекомендуется их настроить.

```sql
-- Включить RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои вакансии
CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: пользователи могут создавать только свои вакансии
CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политика: пользователи могут обновлять только свои вакансии
CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Политика: пользователи могут удалять только свои вакансии
CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = user_id);
```

## 4. Архитектура данных

### Мультитенантность через `user_id`
- Каждая вакансия привязана к `user_id` из `auth.users`
- RLS политики автоматически фильтруют данные по текущему пользователю
- Пользователи видят только свои вакансии

### Безопасность
- Все запросы автоматически фильтруются по `auth.uid()`
- Даже если клиентский код попытается получить чужие данные, RLS заблокирует это
- `ON DELETE CASCADE` автоматически удаляет вакансии при удалении пользователя

## 5. Настройка Email (опционально)

В **Authentication** → **Email Templates** можно настроить:
- Email подтверждения регистрации
- Email сброса пароля
- И другие email-уведомления

