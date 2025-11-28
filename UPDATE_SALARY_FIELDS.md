# Обновление полей Salary Range

## Изменения

Поле `salary_range` было разделено на два отдельных поля:
- `salary_min` - минимальная зарплата (например, "$100k")
- `salary_max` - максимальная зарплата (например, "$150k")

## Обновление базы данных

Выполните следующий SQL в Supabase SQL Editor:

```sql
-- Добавить новые поля
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS salary_min TEXT,
ADD COLUMN IF NOT EXISTS salary_max TEXT;

-- Опционально: мигрировать данные из старого поля (если нужно)
-- Это попытается разобрать старый формат "min - max" или "min+"
UPDATE public.candidates
SET 
  salary_min = CASE 
    WHEN salary_range LIKE '% - %' THEN TRIM(SPLIT_PART(salary_range, ' - ', 1))
    WHEN salary_range LIKE '%+' THEN TRIM(REPLACE(salary_range, '+', ''))
    ELSE NULL
  END,
  salary_max = CASE 
    WHEN salary_range LIKE '% - %' THEN TRIM(SPLIT_PART(salary_range, ' - ', 2))
    ELSE NULL
  END
WHERE salary_range IS NOT NULL;

-- После миграции можно удалить старое поле (опционально)
-- ALTER TABLE public.candidates DROP COLUMN salary_range;
```

## Что изменилось в коде

1. **Типы (`src/types/index.ts`)**:
   - `salaryRange?: string` → `salaryMin?: string` и `salaryMax?: string`

2. **Компоненты**:
   - `AddCandidateModal.tsx`: два отдельных поля ввода
   - `CandidateCard.tsx`: отображение диапазона "min - max" или "min+" или "Up to max"
   - `SearchPage.tsx`: маппинг данных из/в Supabase

3. **SQL скрипт**:
   - `create_candidates_table.sql`: обновлен для новых полей

## Примечание

Если вы не хотите мигрировать старые данные, просто выполните первую часть SQL (добавление новых полей). Старое поле `salary_range` можно оставить или удалить позже.


