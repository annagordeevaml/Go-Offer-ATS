# Setup Unified Titles

## Описание
Добавлена поддержка unified titles (обобщенных должностей) для кандидатов. При загрузке резюме система автоматически определяет стандартизированные должности из списка и сохраняет их в базе данных.

## Шаги для настройки

### 1. Создание таблицы в Supabase

Выполните SQL скрипт из файла `create_candidate_unified_titles_table.sql` в Supabase Dashboard → SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS public.candidate_unified_titles (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  unified_title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, unified_title)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_candidate_unified_titles_candidate_id ON public.candidate_unified_titles(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_unified_titles_unified_title ON public.candidate_unified_titles(unified_title);

-- Enable RLS
ALTER TABLE public.candidate_unified_titles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view unified titles"
  ON public.candidate_unified_titles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admin can manage unified titles"
  ON public.candidate_unified_titles
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Grant permissions
GRANT ALL ON public.candidate_unified_titles TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.candidate_unified_titles_id_seq TO authenticated;
```

### 2. Список Unified Titles

Система использует следующий стандартизированный список должностей (см. `UNIFIED_TITLES_LIST.md`):

- CEO, COO, CTO, CPO, CMO, CFO, CHRO
- Product Manager, Program Manager, Project Manager
- Software Engineer, Backend Engineer, Frontend Engineer, Full-Stack Engineer
- DevOps Engineer, Cloud Engineer, Cybersecurity Engineer
- Data Engineer, Machine Learning Engineer
- Analyst, BI Developer, Data Scientist, QA
- UX/UI Designer, Product Designer, Graphic Designer, Motion Designer
- Marketing Manager, Content Manager, Social Media Manager
- Sales Manager, Business Development Manager
- Account Manager, Customer Success Manager, Customer Support Manager
- Operations Manager, Supply Chain Manager, Logistics Manager
- Strategy Manager, Event Manager, Finance Manager, HR Manager
- Mobile Engineer, Recruiter, Legal Counsel, SDET
- Others

## Как это работает

1. **При загрузке резюме:**
   - ChatGPT анализирует резюме и определяет, какие unified titles соответствуют должностям кандидата
   - Unified titles извлекаются и сохраняются в JSON ответе

2. **При сохранении кандидата:**
   - Unified titles сохраняются в таблицу `candidate_unified_titles`
   - Связь many-to-many: один кандидат может иметь несколько unified titles

3. **В форме редактирования:**
   - Unified titles отображаются как теги
   - Можно добавлять новые unified titles через выпадающий список
   - Можно удалять unified titles, нажав на "×"

4. **При загрузке кандидатов:**
   - Unified titles загружаются из базы данных и отображаются в карточке кандидата

## Проверка

После выполнения SQL скрипта:
1. Проверьте, что таблица `candidate_unified_titles` создана в Supabase
2. Загрузите новое резюме кандидата
3. Проверьте, что unified titles появились в форме редактирования
4. Сохраните кандидата и убедитесь, что unified titles сохранились в базе


