# Обновление Unified Titles для существующих кандидатов

## Описание
Этот документ описывает процесс обновления unified titles для всех существующих кандидатов в базе данных.

## Шаги

### 1. Выполните SQL скрипт для добавления поля unified_titles

Выполните скрипт `add_unified_titles_to_candidates.sql` в Supabase Dashboard → SQL Editor:

```sql
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS unified_titles TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_candidates_unified_titles ON public.candidates USING GIN(unified_titles);
```

### 2. Используйте кнопку "Update Unified Titles"

1. Войдите в систему как администратор (admin@go-offer.us)
2. Перейдите на страницу "Star Catalogue"
3. Нажмите на кнопку "Update All Candidates" (появится рядом с кнопкой "Add Candidate")
4. Дождитесь завершения процесса

### 3. Что происходит при обновлении

- Система загружает всех кандидатов из базы данных
- Для каждого кандидата:
  - Анализирует `job_title`, `industries`, `company_names`
  - Использует ChatGPT API для определения unified titles
  - Если ChatGPT недоступен, использует простое сопоставление по ключевым словам
  - Сохраняет unified titles в таблицу `candidate_unified_titles`
  - Обновляет поле `unified_titles` в таблице `candidates`

### 4. Проверка результатов

После завершения обновления:
1. Откройте любого кандидата для редактирования
2. Проверьте, что в поле "Unified Titles" появились категории
3. Проверьте в Supabase, что данные сохранились в обеих таблицах:
   - `candidates.unified_titles` (массив)
   - `candidate_unified_titles` (связь many-to-many)

## Альтернативный способ (через SQL)

Если нужно обновить unified titles вручную через SQL, можно использовать функцию сопоставления на основе `job_title`:

```sql
-- Пример: обновить unified titles для кандидатов с определенным job_title
UPDATE public.candidates
SET unified_titles = ARRAY['Software Engineer']
WHERE job_title ILIKE '%software engineer%' 
  AND job_title NOT ILIKE '%backend%' 
  AND job_title NOT ILIKE '%frontend%';
```

## Примечания

- Процесс может занять время в зависимости от количества кандидатов
- Используется ChatGPT API, поэтому требуется наличие `VITE_OPENAI_API_KEY`
- Если API недоступен, используется простое сопоставление по ключевым словам
- Unified titles можно редактировать вручную в форме редактирования кандидата


