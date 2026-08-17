const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

const routes = [
  { id: 1, line: "خط 2", from: "حي الشرق", to: "الميناء", duration: 23, fare: 6, nextDeparture: "09:25", color: "#168c8c", vehicleType: "أتوبيس", capacity: 40, availableSeats: 17, driverGender: "رجل", accessible: true, stops: ["حي الشرق", "المحطة الرئيسية", "شارع 23 يوليو", "الميناء"] },
  { id: 2, line: "خط 4", from: "حي العرب", to: "الزهور", duration: 18, fare: 5, nextDeparture: "09:35", color: "#2d9fe8", vehicleType: "ميكروباص", capacity: 14, availableSeats: 6, driverGender: "سيدة", accessible: false, stops: ["حي العرب", "السوق", "الزهور"] },
  { id: 3, line: "خط 7", from: "الضواحي", to: "المستشفى العام", duration: 30, fare: 7, nextDeparture: "09:45", color: "#0f6f78", vehicleType: "أتوبيس", capacity: 35, availableSeats: 9, driverGender: "رجل", accessible: true, stops: ["الضواحي", "المحطة الرئيسية", "الجامعة", "المستشفى العام"] },
  { id: 4, line: "خط 9", from: "بورفؤاد", to: "حي المناخ", duration: 27, fare: 8, nextDeparture: "10:00", color: "#334e68", vehicleType: "سيارة", capacity: 4, availableSeats: 2, driverGender: "سيدة", accessible: false, stops: ["بورفؤاد", "الميناء", "المحطة الرئيسية", "حي المناخ"] },
  { id: 5, line: "Moto 12", from: "حي الشرق", to: "الجامعة", duration: 12, fare: 10, nextDeparture: "09:30", color: "#e07a3f", vehicleType: "دراجة بخارية", capacity: 1, availableSeats: 1, driverGender: "رجل", accessible: false, stops: ["حي الشرق", "شارع 23 يوليو", "الجامعة"] },
  { id: 6, line: "Moto 18", from: "حي العرب", to: "حي المناخ", duration: 15, fare: 9, nextDeparture: "09:40", color: "#9a5de0", vehicleType: "دراجة بخارية", capacity: 1, availableSeats: 1, driverGender: "سيدة", accessible: false, stops: ["حي العرب", "السوق", "حي المناخ"] }
];

const offers = [
  { id: 1, title: "خصم الدراجة البخارية", text: "خصم 20% على أول 3 رحلات بالدراجة البخارية", discount: "20%", type: "motorcycle" },
  { id: 2, title: "رحلة الجامعة", text: "وفر 3 جنيه عند حجز رحلة Moto 12 قبل 9 صباحًا", discount: "-3 ج", type: "motorcycle" },
  { id: 3, title: "عرض الطالب", text: "خصم 15% على الرحلات المختارة للطلاب", discount: "15%", type: "student" }
];

const notifications = [
  { id: 1, type: "info", text: "Moto 12 ستصل خلال 3 دقائق إلى حي الشرق.", time: "الآن" },
  { id: 2, type: "warning", text: "يوجد ازدحام بسيط على خط 7.", time: "منذ 5 دقائق" },
  { id: 3, type: "success", text: "عرض جديد: خصم 20% على أول 3 رحلات بالدراجة البخارية.", time: "اليوم" }
];

let tickets = [];

app.get("/api/health", (req, res) => res.json({ success: true, message: "Waslni API is running" }));
app.get("/api/routes", (req, res) => res.json({ success: true, data: routes }));
app.get("/api/routes/search", (req, res) => {
  const from = String(req.query.from || "").trim().toLowerCase();
  const to = String(req.query.to || "").trim().toLowerCase();
  const type = String(req.query.vehicleType || "").trim().toLowerCase();
  const result = routes.filter(route => {
    const haystack = [route.from, route.to, route.vehicleType, route.line, ...route.stops].join(" ").toLowerCase();
    return (!from || haystack.includes(from)) && (!to || haystack.includes(to)) && (!type || route.vehicleType.toLowerCase().includes(type));
  });
  res.json({ success: true, data: result });
});
app.get("/api/routes/:id", (req, res) => {
  const route = routes.find(r => r.id === Number(req.params.id));
  if (!route) return res.status(404).json({ success: false, message: "الرحلة غير موجودة" });
  res.json({ success: true, data: route });
});
app.get("/api/offers", (req, res) => res.json({ success: true, data: offers }));
app.get("/api/notifications", (req, res) => res.json({ success: true, data: notifications }));
app.post("/api/tickets", (req, res) => {
  const { routeId, paymentMethod = "cash" } = req.body;
  const route = routes.find(r => r.id === Number(routeId));
  if (!route) return res.status(400).json({ success: false, message: "اختاري رحلة صحيحة" });
  const ticket = { id: `W-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, routeId: route.id, line: route.line, vehicleType: route.vehicleType, from: route.from, to: route.to, price: route.fare, paymentMethod, createdAt: new Date().toISOString() };
  tickets.unshift(ticket);
  res.status(201).json({ success: true, data: ticket });
});
app.get("/api/tickets", (req, res) => res.json({ success: true, data: tickets }));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "..", "frontend", "index.html")));
app.listen(PORT, () => console.log(`Waslni website running on http://localhost:${PORT}`));