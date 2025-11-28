# Исправление ошибки "Failed to save job"

## Проблема
При сохранении вакансии появляется ошибка:
- **"Could not find the table 'public.jobs' in the schema cache"** (код PGRST205)
- **404 Not Found** при запросе к `/rest/v1/jobs`

Это означает, что таблица `jobs` не существует в Supabase.

## Решение (БЫСТРОЕ)

### Шаг 1: Создать таблицу в Supabase

1. Откройте **Supabase Dashboard**: https://app.supabase.com
2. Выберите ваш проект
3. Перейдите в **SQL Editor** (в левом меню)
4. Откройте файл `create_jobs_table.sql` из этого проекта
5. Скопируйте весь SQL код из файла
6. Вставьте в SQL Editor в Supabase
7. Нажмите **Run** (или F5)
8. Должно появиться сообщение "Success. No rows returned"

### Шаг 2: Проверить создание таблицы

1. Перейдите в **Table Editor** в Supabase Dashboard
2. Найдите таблицу `jobs` в списке
3. Убедитесь, что она содержит все нужные поля

### Шаг 3: Попробовать снова

1. Обновите страницу в браузере
2. Попробуйте сохранить вакансию снова
3. Теперь должно работать!

## Альтернативное решение (если нет файла SQL)

### 1. Проверьте структуру таблицы `jobs` в Supabase

1. Откройте Supabase Dashboard → **Table Editor**
2. Найдите таблицу `jobs`
3. Убедитесь, что таблица имеет следующие поля:
   - `id` (BIGSERIAL, PRIMARY KEY)
   - `user_id` (UUID, NOT NULL, ссылается на auth.users)
   - `title` (TEXT, NOT NULL)
   - `location` (TEXT, NOT NULL)
   - `posted_date` (TEXT)
   - `match_count` (INTEGER, DEFAULT 0)
   - `skills` (TEXT[] или ARRAY)
   - `status` (TEXT, NOT NULL)
   - `company_name` (TEXT)
   - `industry` (TEXT[] или ARRAY)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

### 2. Если таблицы нет или структура неправильная

Выполните этот SQL в Supabase Dashboard → **SQL Editor**:

```sql
-- Создать таблицу jobs
CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  posted_date TEXT,
  match_count INTEGER DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  company_name TEXT,
  industry TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создать индексы
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
```

### 3. Настройте Row Level Security (RLS)

Выполните этот SQL:

```sql
-- Включить RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Удалить старые политики (если есть)
DROP POLICY IF EXISTS "Users can view own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON jobs;

-- Создать новые политики
CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = user_id);
```

### 4. Проверьте консоль браузера

1. Откройте консоль браузера (F12)
2. Попробуйте сохранить вакансию
3. Посмотрите на ошибки в консоли - там будет детальная информация

### 5. Частые проблемы

**Проблема:** "permission denied for table jobs"
- **Решение:** Проверьте RLS политики (шаг 3)

**Проблема:** "column user_id does not exist"
- **Решение:** Проверьте структуру таблицы (шаг 1-2)

**Проблема:** "null value in column user_id violates not-null constraint"
- **Решение:** Убедитесь, что вы залогинены и `user.id` существует

**Проблема:** "invalid input syntax for type uuid"
- **Решение:** Проверьте, что `user.id` это валидный UUID

### 6. Проверка через консоль

Откройте консоль браузера (F12) и выполните:

```javascript
// Проверьте текущего пользователя
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
console.log('User ID:', user?.id);
```

Если `user` или `user.id` равны `null`, вы не залогинены. Войдите снова.

## После исправления

1. Обновите страницу в браузере
2. Попробуйте сохранить вакансию снова
3. Проверьте консоль на наличие ошибок

