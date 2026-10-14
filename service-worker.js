// service-worker.js

// 1. При установке, немедленно активируем SW
self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
    console.log('Service Worker installing.');
});

// 2. При активации, получаем контроль над страницей
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    console.log('Service Worker activated.');
});

// 3. Слушаем сообщения от schedule.html
self.addEventListener('message', (event) => {
    const data = event.data;

    // Проверяем, что это команда на планирование
    if (data.action === 'scheduleNotification') {
        const { title, body, timestamp } = data;

        // Проверяем, что API уведомлений доступно и разрешение получено
        if (!('Notification' in self) || self.Notification.permission !== 'granted') {
            console.warn('Notifications not permitted or supported.');
            return;
        }

        // Проверяем, поддерживается ли 'showTrigger' (ключевая функция)
        if ('showTrigger' in Notification.prototype) {
            try {
                // Создаем триггер на точное время
                const trigger = new TimestampTrigger(timestamp);

                // Планируем уведомление
                event.waitUntil(
                    self.registration.showNotification(title, {
                        body: body,
                        icon: 'icon-192.png', // Вам нужно добавить иконку 192x192 в папку
                        badge: 'icon-72.png',  // Вам нужно добавить иконку 72x72 в папку
                        showTrigger: trigger,
                        tag: `class-${timestamp}` // Уникальный тег, чтобы избежать дубликатов
                    })
                );

                console.log('Notification scheduled with TimestampTrigger for:', new Date(timestamp));
                // Отправляем ответ об успехе
                if (event.source) {
                    event.source.postMessage({ success: true, timestamp: timestamp });
                }

            } catch (e) {
                console.error('Error scheduling notification:', e);
                if (event.source) {
                    event.source.postMessage({ success: false, error: e.message });
                }
            }
        } else {
            // Fallback для Firefox/Safari (менее надежный)
            // Это сработает, только если SW "доживет" до этого времени
            console.warn('TimestampTrigger is not supported. Using unreliable setTimeout fallback.');
            const delay = timestamp - Date.now();
            if (delay > 0) {
                setTimeout(() => {
                    self.registration.showNotification(title, {
                        body: body,
                        icon: 'icon-192.png',
                        tag: `class-${timestamp}`
                    });
                }, delay);
                if (event.source) {
                    event.source.postMessage({ success: true, timestamp: timestamp, fallback: true });
                }
            }
        }
    }
    // (НОВЫЙ БЛОК) Обработка отмены уведомления
    else if (data.action === 'cancelNotification') {
        const { timestamp } = data;
        const tag = `class-${timestamp}`;

        event.waitUntil(
            self.registration.getNotifications({ tag: tag })
                .then(notifications => {
                    if (notifications && notifications.length > 0) {
                        notifications.forEach(notification => notification.close());
                        console.log(`Cancelled notification with tag: ${tag}`);
                        if (event.source) {
                            event.source.postMessage({ success: true, cancelledTimestamp: timestamp });
                        }
                    } else {
                        console.warn(`No notification found with tag: ${tag}`);
                        if (event.source) {
                            event.source.postMessage({ success: false, error: 'Notification not found', cancelledTimestamp: timestamp });
                        }
                    }
                })
                .catch(e => {
                    console.error('Error cancelling notification:', e);
                    if (event.source) {
                        event.source.postMessage({ success: false, error: e.message });
                    }
                })
        );
    }
});