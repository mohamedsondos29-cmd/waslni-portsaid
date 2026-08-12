const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

const routes = [
  {
    id: 1,
    line: "خط 2",
    from: "حي الشرق",
    to: "الميناء",
    duration: 23,
    fare: 6,
    nextDeparture: "09:25",
    color: "#168c8c",
    stops: ["حي الشرق", "المحطة الرئيسية", "شارع 23 يوليو", "الميناء"]
  },
  {
    id: 2,
    line: "خط 4",
    from: "حي العرب",
    to: "الزهور",
    duration: 18,
    fare: 5,
    nextDeparture: "09:35",
    color: "#2d9fe8",
    stops: ["حي العرب", "السوق", "الزهور"]
  },
  {
    id: 3,
    line: "خط 7",
    from: "الضواحي",
    to: "المستشفى العام",
    duration: 30,
    fare: 7,
    nextDeparture: "09:45",
    color: "#0f6f78",
    stops: ["الضواحي", "المحطة الرئيسية", "الجامعة", "المستشفى العام"]
  },
  {
    id: 4,
    line: "خط 9",
    from: "بورفؤاد",
    to: "حي المناخ",
    duration: 27,
    fare: 8,
    nextDeparture: "10:00",
    color: "#334e68",
    stops: ["بورفؤاد", "الميناء", "المحطة الرئيسية", "حي المناخ"]
  }
];

let notifications = [
  { id: 1, type: "info", text: "الحافلة على خط 2 ستصل خلال 3 دقائق.", time: "الآن" },
  { id: 2, type: "warning", text: "يوجد تغيير بسيط في موعد خط 4.", time: "منذ 5 دقائق" },
  { id: 3, type: "success", text: "تم شحن رصيدك بنجاح بقيمة 20 جنيه.", time: "اليوم" }
];

let tickets = [];

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Waslni API is running" });
});

app.get("/api/routes", (req, res) => {
  res.json({ success: true, data: routes });
});

app.get("/api/routes/search", (req, res) => {
  const from = String(req.query.from || "").trim().toLowerCase();
  const to = String(req.query.to || "").trim().toLowerCase();

  const result = routes.filter(route => {
    const haystack = [route.from, route.to, ...route.stops, route.line]
      .join(" ")
      .toLowerCase();

    const fromMatch = !from || haystack.includes(from);
    const toMatch = !to || haystack.includes(to);
    return fromMatch && toMatch;
  });

  res.json({ success: true, data: result });
});

app.get("/api/routes/:id", (req, res) => {
  const route = routes.find(r => r.id === Number(req.params.id));
  if (!route) return res.status(404).json({ success: false, message: "الرحلة غير موجودة" });
  res.json({ success: true, data: route });
});

app.get("/api/notifications", (req, res) => {
  res.json({ success: true, data: notifications });
});

app.post("/api/tickets", (req, res) => {
  const { routeId } = req.body;
  const route = routes.find(r => r.id === Number(routeId));

  if (!route) {
    return res.status(400).json({ success: false, message: "اختاري رحلة صحيحة" });
  }

  const ticket = {
    id: `W-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    routeId: route.id,
    line: route.line,
    from: route.from,
    to: route.to,
    price: route.fare,
    createdAt: new Date().toISOString()
  };

  tickets.unshift(ticket);
  res.status(201).json({ success: true, data: ticket });
});

app.get("/api/tickets", (req, res) => {
  res.json({ success: true, data: tickets });
});

app.post("/api/notifications", (req, res) => {
  const { text, type = "info" } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, message: "اكتبي نص التنبيه" });
  }

  const item = {
    id: Date.now(),
    type,
    text,
    time: "الآن"
  };

  notifications.unshift(item);
  res.status(201).json({ success: true, data: item });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Waslni website running on http://localhost:${PORT}`);
});