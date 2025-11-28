// Скрипт для очистки кандидатов из localStorage
// Выполните этот код в консоли браузера (F12 → Console)

// Вариант 1: Очистить все localStorage
localStorage.clear();
console.log('✅ Все данные из localStorage удалены');

// Вариант 2: Удалить только кандидатов (если они хранятся под конкретным ключом)
// Раскомментируйте нужные строки:

// localStorage.removeItem('candidates');
// localStorage.removeItem('gooffer_candidates');
// localStorage.removeItem('candidates_data');

// Вариант 3: Показать все ключи в localStorage
console.log('Все ключи в localStorage:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`- ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
}

// После очистки обновите страницу
// window.location.reload();


