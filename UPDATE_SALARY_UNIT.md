# Обновление базы данных: Добавление единицы измерения зарплаты

## Описание
Добавлена поддержка единиц измерения для зарплаты кандидатов: год (year), месяц (month) или час (hour).

## Шаги для обновления базы данных

1. Откройте Supabase Dashboard → SQL Editor

2. Выполните SQL скрипт из файла `add_salary_unit.sql`:

```sql
-- Add salary_unit column to candidates table
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS salary_unit TEXT DEFAULT 'year' CHECK (salary_unit IN ('year', 'month', 'hour'));

-- Update existing records to have 'year' as default if they have salary data
UPDATE public.candidates
SET salary_unit = 'year'
WHERE (salary_min IS NOT NULL OR salary_max IS NOT NULL) AND salary_unit IS NULL;
```

3. Проверьте, что колонка добавлена:
   - Перейдите в Table Editor → `candidates`
   - Убедитесь, что появилась колонка `salary_unit` со значением по умолчанию `'year'`

## Что изменилось в приложении

1. **Тип данных**: Добавлено поле `salaryUnit?: 'year' | 'month' | 'hour'` в интерфейс `Candidate`

2. **Форма добавления/редактирования кандидата**:
   - Добавлено поле выбора единицы измерения (Per Year / Per Month / Per Hour)
   - По умолчанию устанавливается "Per Year"

3. **Отображение зарплаты**:
   - Зарплата отображается с единицей измерения (например: "$100,000 - $150,000 /year")
   - Числа форматируются с запятыми для тысяч
   - Единица измерения отображается в верхней части карточки и в мета-информации

4. **База данных**:
   - Новое поле `salary_unit` в таблице `candidates`
   - Значение по умолчанию: `'year'`
   - Ограничение: только 'year', 'month' или 'hour'

## Примеры отображения

- **Годовая зарплата**: "$100,000 - $150,000 /year"
- **Месячная зарплата**: "$8,000 - $12,000 /month"
- **Почасовая зарплата**: "$50 - $75 /hour"


