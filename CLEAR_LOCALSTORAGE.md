# Очистка кандидатов из localStorage

## Быстрый способ (через консоль браузера)

1. Откройте консоль браузера: **F12** (или **Cmd+Option+I** на Mac)
2. Перейдите на вкладку **Console**
3. Вставьте и выполните один из вариантов:

### Вариант 1: Очистить ВСЕ localStorage
```javascript
localStorage.clear();
console.log('✅ Все данные из localStorage удалены');
window.location.reload();
```

### Вариант 2: Показать все ключи и удалить нужные
```javascript
// Показать все ключи
console.log('Все ключи в localStorage:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`- ${key}`);
}

// Удалить конкретные ключи (если нужно)
// localStorage.removeItem('candidates');
// localStorage.removeItem('gooffer_candidates');
```

### Вариант 3: Удалить только ключи, связанные с кандидатами
```javascript
// Удалить все ключи, содержащие "candidate"
Object.keys(localStorage).forEach(key => {
  if (key.toLowerCase().includes('candidate')) {
    localStorage.removeItem(key);
    console.log(`✅ Удален ключ: ${key}`);
  }
});
```

## Через DevTools (визуально)

1. Откройте **Developer Tools**: **F12**
2. Перейдите на вкладку **Application** (Chrome) или **Storage** (Firefox)
3. Найдите **Local Storage** в левом меню
4. Выберите ваш домен (например, `http://localhost:3000`)
5. Правой кнопкой мыши → **Clear** (или выберите конкретные ключи и удалите)

## Примечание

В текущей версии приложения кандидаты хранятся в состоянии React компонента, а не в localStorage. Если вы хотите удалить тестовых кандидатов из интерфейса, нужно будет обновить код компонента `SearchPage.tsx`.


