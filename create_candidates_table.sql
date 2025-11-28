-- Создание таблицы candidates в Supabase
-- Только специальный пользователь может добавлять/изменять кандидатов
-- Все остальные могут только просматривать

-- 1. Создать таблицу candidates
CREATE TABLE IF NOT EXISTS public.candidates (
  id BIGSERIAL PRIMARY KEY,
  
  -- Основная информация
  name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  location TEXT NOT NULL,
  experience TEXT,
  availability TEXT,
  ready_to_relocate_to TEXT[] DEFAULT '{}',
  last_updated TEXT,
  match_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'actively_looking' CHECK (status IN ('actively_looking', 'open_to_offers')),
  
  -- Индустрии и компании
  industries TEXT[] DEFAULT '{}',
  related_industries TEXT[] DEFAULT '{}',
  company_names TEXT[] DEFAULT '{}',
  
  -- Навыки и резюме
  skills TEXT[] DEFAULT '{}',
  summary TEXT,
  
  -- Социальные ссылки (храним как JSONB)
  social_links JSONB DEFAULT '{}',
  calendly TEXT,
  salary_min TEXT,
  salary_max TEXT,
  salary_unit TEXT DEFAULT 'year' CHECK (salary_unit IN ('year', 'month', 'hour')),
  unified_titles TEXT[] DEFAULT '{}',
  
  -- Резюме (храним как JSONB для гибкости)
  resume_data JSONB,
  
  -- Метаданные
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ID пользователя, который создал запись (для админа)
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Создать индексы для производительности
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_job_title ON public.candidates(job_title);
CREATE INDEX IF NOT EXISTS idx_candidates_location ON public.candidates(location);
CREATE INDEX IF NOT EXISTS idx_candidates_skills ON public.candidates USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_candidates_industries ON public.candidates USING GIN(industries);
CREATE INDEX IF NOT EXISTS idx_candidates_created_by ON public.candidates(created_by_user_id);

-- 3. Создать функцию для проверки email админа
-- Эта функция безопасно получает email пользователя из auth.users
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Получаем email текущего пользователя
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Проверяем, является ли пользователь админом
  -- ЗАМЕНИТЕ 'admin@go-offer.us' на нужный email
  RETURN user_email = 'admin@go-offer.us';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Включить Row Level Security (RLS)
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- 5. Удалить старые политики (если есть)
DROP POLICY IF EXISTS "Anyone can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admin can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admin can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admin can delete candidates" ON public.candidates;

-- 6. Создать RLS политики

-- Политика: Все аутентифицированные пользователи могут просматривать кандидатов
CREATE POLICY "Anyone can view candidates"
  ON public.candidates FOR SELECT
  TO authenticated
  USING (true);

-- Политика: Только специальный админ может добавлять кандидатов
-- Используем функцию is_admin_user() для проверки
CREATE POLICY "Admin can insert candidates"
  ON public.candidates FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

-- Политика: Только специальный админ может обновлять кандидатов
CREATE POLICY "Admin can update candidates"
  ON public.candidates FOR UPDATE
  TO authenticated
  USING (public.is_admin_user());

-- Политика: Только специальный админ может удалять кандидатов
CREATE POLICY "Admin can delete candidates"
  ON public.candidates FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

-- 7. Дать права на таблицу
GRANT ALL ON public.candidates TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE candidates_id_seq TO authenticated;

-- 8. Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_candidates_updated_at ON public.candidates;
CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON public.candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

