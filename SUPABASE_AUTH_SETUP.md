# Настройка Supabase Authentication

## Проблема "Failed to fetch"

Ошибка "Failed to fetch" обычно возникает из-за:

1. **Неправильный API ключ** - нужно использовать `anon` ключ, а не `publishable`
2. **CORS проблемы** - Supabase должен быть правильно настроен
3. **Неправильный URL** - проверьте, что URL проекта правильный

## Как найти правильный ключ

1. Откройте Supabase Dashboard: https://app.supabase.com
2. Выберите ваш проект
3. Перейдите в **Settings** → **API**
4. Найдите **Project API keys**
5. Скопируйте **anon/public** ключ (НЕ service_role!)

Обновите `src/lib/supabaseClient.ts`:
```typescript
const supabaseAnonKey = 'ваш_anon_ключ_здесь';
```

## Настройка Email Confirmation

Чтобы регистрация приходила на почту:

### 1. Включите Email Provider (ОБЯЗАТЕЛЬНО!)

**ВАЖНО:** Если вы видите ошибку "Email signups are disabled", это означает, что Email provider отключен.

1. В Supabase Dashboard перейдите в **Authentication** → **Providers**
2. Найдите **Email** provider
3. **Нажмите на Email provider**, чтобы открыть настройки
4. **Включите** переключатель "Enable Email provider" (или кнопку "Enable")
5. **Сохраните** изменения
6. Теперь регистрация через email будет работать

### 2. Настройте Email Confirmation

1. Перейдите в **Authentication** → **URL Configuration**
2. Установите **Site URL**: `http://localhost:3000` (для разработки) или ваш production URL
3. Установите **Redirect URLs**: добавьте `http://localhost:3000/**` для разработки

### 3. Настройте Email Templates

1. Перейдите в **Authentication** → **Email Templates**
2. Найдите шаблон **Confirm signup**
3. Можно настроить текст письма или оставить по умолчанию

### 4. Настройки подтверждения email

В **Authentication** → **Settings**:
- **Enable email confirmations**: Включено (рекомендуется)
- **Secure email change**: Включено (рекомендуется)

### 5. Для разработки (отключить подтверждение email)

**ВАЖНО:** Если вы видите ошибку "Error sending confirmation email" (500), это означает, что email сервис не настроен. Для быстрого тестирования отключите подтверждение email:

1. Перейдите в **Authentication** → **Settings**
2. Найдите **Enable email confirmations**
3. **Отключите** эту опцию
4. Сохраните изменения
5. Теперь регистрация будет работать без подтверждения email
6. **ВАЖНО:** Включите обратно для production!

### 6. Настройка Email Provider (для production)

Если хотите использовать email подтверждения:

1. Перейдите в **Authentication** → **Providers** → **Email**
2. Убедитесь, что Email provider включен
3. Настройте SMTP (опционально) или используйте встроенный email сервис Supabase
4. Проверьте **Email Templates** - они должны быть настроены
5. Убедитесь, что **Site URL** и **Redirect URLs** правильно настроены

## Проверка работы

1. Попробуйте зарегистрироваться с новым email
2. Проверьте папку Spam, если письмо не пришло
3. Проверьте консоль браузера на ошибки
4. Проверьте Supabase Dashboard → Authentication → Users - должен появиться новый пользователь

## Отладка

Если все еще не работает:

1. Откройте консоль браузера (F12)
2. Проверьте Network tab - какие запросы отправляются и какие ошибки возвращаются
3. Проверьте, что URL и ключ правильные в `supabaseClient.ts`
4. Убедитесь, что Email provider включен в Supabase Dashboard

