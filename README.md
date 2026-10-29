# SmartSpine — демонстрационный мобильный прототип

Это стартовый проект Vue 3 + Vite с адаптивным интерфейсом для Android. Сейчас данные тестовые: датчики, Bluetooth и сервер не подключены.

## Что уже есть
- Главный экран мониторинга
- Демонстрационный угол наклона спины
- Распределение нагрузки между левой и правой ногой
- История измерений с примерным графиком
- Генерация новых тестовых показателей
- Пауза/продолжение и сброс демо
- Адаптивная верстка для телефона

## Запуск на компьютере (Windows)
1. Установите Node.js LTS.
2. Распакуйте архив и откройте папку `SmartSpine` в VS Code.
3. Откройте терминал VS Code и выполните:

```powershell
npm install
npm run dev
```

4. Откройте адрес, который покажет Vite, например `http://localhost:5173`.

## Сборка Android APK
Для APK можно обернуть веб-приложение в Capacitor. Это следующий этап; для Android-сборки понадобятся Android Studio и Android SDK.

```powershell
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init SmartSpine kg.smartspine.app --web-dir=dist
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

В Android Studio выберите **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

> Для первой сборки нужен установленный Android Studio и Android SDK. Команды Capacitor выполняются один раз для добавления Android-проекта; если папка `android` уже существует, не запускайте `npx cap add android` повторно.

## Важно
- Все показания придуманы для демонстрации и не являются медицинскими измерениями.
- Приложение не диагностирует сколиоз и не заменяет врача.
- Для реального устройства нужно разработать протокол передачи данных ESP32, калибровку датчиков и BLE-подключение.
