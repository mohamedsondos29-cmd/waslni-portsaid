const API = "/api";

let allRoutes = [];
let selectedRoute = null;
let map;
let routeLayer;
let userMarker;

const routesGrid = document.getElementById("routesGrid");
const fromInput = document.getElementById("fromInput");
const toInput = document.getElementById("toInput");

async function api(url, options = {}) {
  const response = await fetch(`${API}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "حدث خطأ");
  return data;
}

async function loadRoutes(url = "/routes") {
  routesGrid.innerHTML = `<div class="loading">جاري تحميل الرحلات...</div>`;
  try {
    const result = await api(url);
    allRoutes = result.data;
    renderRoutes(allRoutes);
    if (allRoutes.length) drawRoute(allRoutes[0]);
  } catch (error) {
    routesGrid.innerHTML = `<div class="loading">تعذر الاتصال بالـ API: ${error.message}</div>`;
  }
}

function renderRoutes(routes) {
  if (!routes.length) {
    routesGrid.innerHTML = `<div class="loading">لا توجد رحلات مطابقة للبحث.</div>`;
    return;
  }

  routesGrid.innerHTML = routes.map(route => `
    <article class="route-card">
      <div class="route-top">
        <span class="route-badge">${route.line}</span>
        <span class="route-time">${route.nextDeparture}</span>
      </div>
      <h3>${route.from} → ${route.to}</h3>
      <p>يمر بـ: ${route.stops.join(" • ")}</p>
      <div class="route-meta">
        <span>⏱️ ${route.duration} دقيقة</span>
        <span>💰 ${route.fare} جنيه</span>
      </div>
      <button class="primary-btn" onclick="openTicket(${route.id})">احجز التذكرة</button>
      <button class="secondary-btn full" onclick="showRoute(${route.id})">تتبع الرحلة</button>
    </article>
  `).join("");
}

async function searchRoutes() {
  const from = encodeURIComponent(fromInput.value.trim());
  const to = encodeURIComponent(toInput.value.trim());

  if (!from && !to) {
    loadRoutes();
    return;
  }

  await loadRoutes(`/routes/search?from=${from}&to=${to}`);
  document.getElementById("routes").scrollIntoView({ behavior: "smooth" });
}

function initMap() {
  map = L.map("leafletMap").setView([31.2653, 32.3019], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

function drawRoute(route) {
  if (!map) return;

  if (routeLayer) map.removeLayer(routeLayer);

  const points = {
    1: [[31.2653, 32.3019], [31.2755, 32.3072], [31.255, 32.304], [31.2465, 32.307]],
    2: [[31.260, 32.290], [31.270, 32.295], [31.281, 32.301]],
    3: [[31.275, 32.275], [31.267, 32.300], [31.255, 32.315], [31.245, 32.325]],
    4: [[31.225, 32.305], [31.245, 32.307], [31.265, 32.302], [31.285, 32.295]]
  };

  const coords = points[route.id] || points[1];
  routeLayer = L.polyline(coords, {
    color: route.color,
    weight: 7,
    opacity: .9
  }).addTo(map);

  coords.forEach((coord, index) => {
    L.circleMarker(coord, {
      radius: index === 0 || index === coords.length - 1 ? 9 : 6,
      color: route.color,
      fillColor: "#fff",
      fillOpacity: 1,
      weight: 3
    }).addTo(routeLayer).bindPopup(
      `<strong>${index === 0 ? "البداية" : index === coords.length - 1 ? "النهاية" : "محطة"}</strong><br>${route.stops[index] || route.stops[0]}`
    );
  });

  map.fitBounds(routeLayer.getBounds(), { padding: [35, 35] });
}

async function showRoute(id) {
  try {
    const result = await api(`/routes/${id}`);
    selectedRoute = result.data;
    drawRoute(selectedRoute);
    document.getElementById("map").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    alert(error.message);
  }
}

window.openTicket = async function(id) {
  selectedRoute = allRoutes.find(r => r.id === id);
  if (!selectedRoute) return;

  document.getElementById("ticketDetails").innerHTML = `
    <div class="ticket-summary">
      <strong>${selectedRoute.line}</strong><br>
      ${selectedRoute.from} → ${selectedRoute.to}<br>
      الموعد: ${selectedRoute.nextDeparture}<br>
      التكلفة: ${selectedRoute.fare} جنيه
    </div>
  `;
  document.getElementById("ticketResult").innerHTML = "";
  document.getElementById("ticketModal").classList.add("show");
};

async function confirmTicket() {
  if (!selectedRoute) return;

  try {
    const result = await api("/tickets", {
      method: "POST",
      body: JSON.stringify({ routeId: selectedRoute.id })
    });

    document.getElementById("ticketResult").innerHTML = `
      <div class="ticket-success">
        تم الحجز بنجاح 🎉<br>
        كود التذكرة: <strong>${result.data.id}</strong>
      </div>
    `;
  } catch (error) {
    document.getElementById("ticketResult").innerHTML =
      `<div class="ticket-success">${error.message}</div>`;
  }
}

async function loadNotifications() {
  try {
    const result = await api("/notifications");
    const list = document.getElementById("notificationList");
    document.getElementById("notificationCount").textContent = result.data.length;

    list.innerHTML = result.data.map(item => `
      <div class="notification-item">
        <span class="dot"></span>
        <div>
          <p>${item.text}</p>
          <small>${item.time}</small>
        </div>
      </div>
    `).join("");
  } catch (error) {
    console.error(error);
  }
}

function locateUser() {
  if (!navigator.geolocation) {
    alert("المتصفح لا يدعم تحديد الموقع.");
    return;
  }

  navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords;
    map.setView([latitude, longitude], 15);

    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([latitude, longitude]).addTo(map)
      .bindPopup("📍 موقعك الحالي")
      .openPopup();
  }, () => {
    alert("لم نتمكن من الحصول على موقعك. اسمحي للموقع باستخدام Location.");
  });
}

document.getElementById("searchBtn").addEventListener("click", searchRoutes);
document.getElementById("refreshRoutes").addEventListener("click", () => loadRoutes());
document.getElementById("nearbyBtn").addEventListener("click", () => {
  document.getElementById("map").scrollIntoView({ behavior: "smooth" });
  drawRoute(allRoutes[0]);
});
document.getElementById("fitBtn").addEventListener("click", () => {
  if (routeLayer) map.fitBounds(routeLayer.getBounds(), { padding: [35, 35] });
});
document.getElementById("locateBtn").addEventListener("click", locateUser);

document.getElementById("notificationBtn").addEventListener("click", () => {
  document.getElementById("notificationPanel").classList.add("open");
  loadNotifications();
});
document.getElementById("closeNotifications").addEventListener("click", () => {
  document.getElementById("notificationPanel").classList.remove("open");
});
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("ticketModal").classList.remove("show");
});
document.getElementById("confirmTicket").addEventListener("click", confirmTicket);

document.addEventListener("keydown", e => {
  if (e.key === "Enter" && (document.activeElement === fromInput || document.activeElement === toInput)) {
    searchRoutes();
  }
});

initMap();
loadRoutes();
loadNotifications();
