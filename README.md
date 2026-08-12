# وصلني بورسعيد 🚍

موقع مواصلات عامة Interactive مستوحى من التصميم المرفق، ويحتوي على Frontend + Backend API.

## المميزات
- بحث عن الرحلات من وإلى.
- عرض الرحلات من Backend API.
- خريطة تفاعلية باستخدام Leaflet + OpenStreetMap.
- تحديد موقع المستخدم من المتصفح.
- تتبع مسار الرحلة على الخريطة.
- حجز تذكرة إلكترونية وإنشاء كود Ticket.
- Notifications يتم تحميلها من API.
- Responsive على الموبايل والكمبيوتر.
- RTL وعربي.

## التشغيل

1. افتحي Terminal داخل فولدر المشروع.
2. شغلي:

```bash
npm install
npm start
```

3. افتحي:
http://localhost:3000

## أهم API Endpoints

- GET `/api/health`
- GET `/api/routes`
- GET `/api/routes/search?from=حي الشرق&to=الميناء`
- GET `/api/routes/:id`
- GET `/api/notifications`
- POST `/api/tickets`
- GET `/api/tickets`
- POST `/api/notifications`

## ملاحظة
بيانات الرحلات الحالية Demo Data للتجربة. يمكن بعد ذلك ربطها بقاعدة بيانات MySQL/MongoDB أو API حقيقي للمواصلات.
