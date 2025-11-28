# Обновление Unified Titles для всех кандидатов

Этот скрипт обновит unified titles для всех существующих кандидатов в базе данных.

## Что делает скрипт:

1. **Создает функцию `add_related_unified_titles`** - автоматически добавляет связанные тайтлы:
   - CMO → Marketing Manager
   - CPO → Product Manager
   - CFO → Finance Manager
   - CHRO → HR Manager
   - COO → Operations Manager

2. **Обновляет unified_titles для всех кандидатов**:
   - Берет unified titles из таблицы `candidate_unified_titles`
   - Добавляет связанные тайтлы через функцию
   - Обновляет колонку `unified_titles` в таблице `candidates`

3. **Показывает статистику** после выполнения:
   - Общее количество кандидатов
   - Количество кандидатов с unified titles
   - Количество кандидатов с CMO
   - Количество кандидатов с Marketing Manager

## Как выполнить:

1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Скопируйте содержимое файла `update_all_candidates_unified_titles.sql`
4. Вставьте в SQL Editor
5. Нажмите "Run" или выполните запрос

## Важно:

- Убедитесь, что колонка `unified_titles` уже добавлена в таблицу `candidates` (выполните `add_unified_titles_column.sql` если еще не сделали)
- Скрипт безопасен для повторного выполнения - он обновит только те записи, которые нужно обновить


