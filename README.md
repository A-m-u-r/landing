# Landing

Одностраничный лендинг для ведущей. Сбор заявок идет через FormSubmit на `aigul.baimurzina@mail.ru`.

## Структура

```
src/
  components/   UI-компоненты
  sections/     Секции лендинга
  data/         Контент и списки
  layouts/      Макеты
  pages/        Страницы (index, thanks)
  styles/       Глобальные стили
public/
  reveal.js     Скрипт анимации появления
```

## Команды

```
pnpm install
pnpm dev
pnpm build
pnpm preview
```

## Форма заявки

Форма отправляет данные на FormSubmit. При первом запросе сервис попросит подтвердить email.
Маршрут успешной отправки: `/thanks`.

