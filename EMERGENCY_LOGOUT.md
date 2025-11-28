# Экстренный выход из системы

Если кнопка "Sign Out" не работает, используйте один из этих способов:

## Способ 1: Через консоль браузера (БЫСТРЫЙ)

1. Откройте консоль браузера: **F12** или **Cmd+Option+I** (Mac) / **Ctrl+Shift+I** (Windows)
2. Перейдите на вкладку **Console**
3. Вставьте и выполните этот код:

```javascript
// Выйти из Supabase
await supabase.auth.signOut();
// Очистить localStorage
localStorage.clear();
// Перезагрузить страницу
window.location.href = '/';
```

Или одной строкой:
```javascript
await supabase.auth.signOut().then(() => { localStorage.clear(); window.location.href = '/'; });
```

## Способ 2: Очистить данные браузера

1. Откройте **Developer Tools** (F12)
2. Перейдите на вкладку **Application** (Chrome) или **Storage** (Firefox)
3. Найдите **Local Storage** → ваш домен
4. Удалите все записи (или нажмите правой кнопкой → Clear)
5. Найдите **Session Storage** → ваш домен
6. Удалите все записи
7. Обновите страницу (F5)

## Способ 3: Через Supabase Dashboard

1. Откройте Supabase Dashboard: https://app.supabase.com
2. Перейдите в **Authentication** → **Users**
3. Найдите ваш пользователя
4. Нажмите на три точки → **Delete user** (или просто закройте сессию)

## Способ 4: Инкогнито режим

1. Откройте новое окно в режиме инкогнито
2. Перейдите на http://localhost:3000
3. Вы будете не залогинены

## После выхода

После использования любого из способов:
1. Обновите страницу (F5)
2. Вы должны увидеть страницу входа
3. Если нет - очистите кэш браузера (Cmd+Shift+R / Ctrl+Shift+R)


