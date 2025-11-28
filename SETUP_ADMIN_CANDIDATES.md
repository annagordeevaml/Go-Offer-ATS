# Настройка базы кандидатов с ограниченным доступом

## Цель
Создать базу кандидатов, которую может пополнять только один специальный пользователь (админ). Все остальные пользователи могут только просматривать кандидатов.

## Шаг 1: Создать специальный аккаунт админа

1. Откройте ваше приложение: http://localhost:3000
2. Зарегистрируйтесь с email и паролем, которые будут использоваться только для добавления кандидатов
   - **Рекомендуемый email:** `admin@go-offer.us` (или любой другой)
   - **Пароль:** придумайте надежный пароль
3. Запомните эти данные - они понадобятся для входа

## Шаг 2: Создать таблицу candidates в Supabase

1. Откройте **Supabase Dashboard**: https://app.supabase.com
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Откройте файл `create_candidates_table.sql`
5. **ВАЖНО:** Найдите в SQL строки с `'admin@go-offer.us'` и замените на email, который вы использовали в Шаге 1
6. Скопируйте весь SQL код
7. Вставьте в SQL Editor в Supabase
8. Нажмите **Run** (или F5)
9. Должно появиться сообщение "Success. No rows returned"

## Шаг 3: Проверить создание таблицы

1. Перейдите в **Table Editor** в Supabase Dashboard
2. Найдите таблицу `candidates` в списке
3. Убедитесь, что она содержит все нужные поля

## Шаг 4: Проверить права доступа

### Тест 1: Вход как админ
1. Войдите в приложение с email и паролем админа
2. Попробуйте добавить кандидата
3. Должно работать ✅

### Тест 2: Вход как обычный пользователь
1. Зарегистрируйтесь с другим email (не админ)
2. Попробуйте добавить кандидата
3. Должна появиться ошибка о недостаточных правах ❌
4. Но просмотр кандидатов должен работать ✅

## Как это работает

- **Все пользователи** могут просматривать кандидатов (SELECT)
- **Только админ** (с указанным email) может:
  - Добавлять кандидатов (INSERT)
  - Изменять кандидатов (UPDATE)
  - Удалять кандидатов (DELETE)

Права проверяются через RLS политики на уровне базы данных, поэтому даже если кто-то попытается обойти проверки в коде, база данных заблокирует операцию.

## Изменение админа

Если нужно изменить email админа:

1. Откройте Supabase Dashboard → **SQL Editor**
2. Выполните:

```sql
-- Удалить старые политики
DROP POLICY IF EXISTS "Admin can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admin can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admin can delete candidates" ON public.candidates;

-- Создать новые политики с новым email
CREATE POLICY "Admin can insert candidates"
  ON public.candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'новый_email@example.com'  -- ЗАМЕНИТЕ
    )
  );

CREATE POLICY "Admin can update candidates"
  ON public.candidates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'новый_email@example.com'  -- ЗАМЕНИТЕ
    )
  );

CREATE POLICY "Admin can delete candidates"
  ON public.candidates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'новый_email@example.com'  -- ЗАМЕНИТЕ
    )
  );
```

## Безопасность

- Права проверяются на уровне базы данных (RLS)
- Даже если кто-то получит доступ к коду, он не сможет обойти RLS политики
- Email админа хранится в политиках, но не в коде приложения
- Рекомендуется использовать надежный пароль для админ-аккаунта


