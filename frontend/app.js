const API = "/api";
let allRoutes = [], selectedRoute = null, map, routeLayer, userMarker, busMarker, liveTimer;
const routesGrid = document.getElementById("routesGrid"), fromInput = document.getElementById("fromInput"), toInput = document.getElementById("toInput");

async function api(url, options = {}) {
  const response = await fetch(`${API}${url}`, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "حدث خطأ");
  return data;
}

async function loadRoutes(url = "/routes") {
  routesGrid.innerHTML = `<div class="loading">جاري تحميل الرحلات...</div>`;
  try {
    const result = await api(url);
    allRoutes = result.data || [];
    renderRoutes(allRoutes);
    if (allRoutes.length) selectRoute(allRoutes[0], false);
  } catch (error) {
    routesGrid.innerHTML = `<div class="loading">تعذر الاتصال بالـ API: ${error.message}</div>`;
  }
}

function routeAccessible(route) { return Boolean(route.accessible ?? route.wheelchair ?? route.isAccessible ?? route.id % 2 === 0); }
function routeBusy(route) { return Boolean(route.busy ?? route.crowded ?? route.id === 3); }

function renderRoutes(routes) {
  const filter = document.getElementById("statusFilter")?.value || "all";
  let filtered = routes;
  if (filter === "accessible") filtered = routes.filter(routeAccessible);
  if (filter === "busy") filtered = routes.filter(routeBusy);
  if (filter === "on-time") filtered = routes.filter(r => !routeBusy(r));
  if (!filtered.length) { routesGrid.innerHTML = `<div class="loading">لا توجد رحلات مطابقة للفلاتر الحالية.</div>`; return; }
  routesGrid.innerHTML = filtered.map(route => `
    <article class="route-card ${routeAccessible(route) ? "accessible-card" : ""}">
      <div class="route-top"><span class="route-badge">${route.line}</span><span class="route-time">${route.nextDeparture}</span></div>
      <h3>${route.from} → ${route.to}</h3><p>يمر بـ: ${(route.stops || []).join(" • ")}</p>
      <div class="route-tags"><span class="live-tag">● LIVE</span>${routeAccessible(route) ? '<span class="access-tag">♿ Accessible</span>' : ""}${routeBusy(route) ? '<span class="busy-tag">ازدحام</span>' : ""}</div>
      <div class="route-meta"><span>⏱️ ${route.duration} دقيقة</span><span>💰 ${route.fare} جنيه</span></div>
      <button class="primary-btn" onclick="openTicket(${route.id})">🎟️ احجز التذكرة</button>
      <button class="secondary-btn full" onclick="showRoute(${route.id})">🛰️ تتبع الرحلة</button>
    </article>`).join("");
}

async function searchRoutes() {
  const from = encodeURIComponent(fromInput.value.trim()), to = encodeURIComponent(toInput.value.trim());
  if (!from && !to) { loadRoutes(); return; }
  await loadRoutes(`/routes/search?from=${from}&to=${to}`);
  document.getElementById("routes").scrollIntoView({ behavior: "smooth" });
}

function initMap() {
  map = L.map("leafletMap").setView([31.2653, 32.3019], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
}

function getRouteCoords(route) {
  return {
    1: [[31.2653,32.3019],[31.2755,32.3072],[31.255,32.304],[31.2465,32.307]],
    2: [[31.260,32.290],[31.270,32.295],[31.281,32.301]],
    3: [[31.275,32.275],[31.267,32.300],[31.255,32.315],[31.245,32.325]],
    4: [[31.225,32.305],[31.245,32.307],[31.265,32.302],[31.285,32.295]]
  }[route.id] || [[31.2653,32.3019],[31.2755,32.3072],[31.255,32.304]];
}

function drawRoute(route) {
  if (!map) return;
  if (routeLayer) map.removeLayer(routeLayer);
  if (busMarker) map.removeLayer(busMarker);
  const coords = getRouteCoords(route), color = route.color || "#168c8c";
  routeLayer = L.layerGroup().addTo(map);
  L.polyline(coords, { color, weight: 7, opacity: .9 }).addTo(routeLayer);
  coords.forEach((coord, index) => L.circleMarker(coord, { radius: index === 0 || index === coords.length - 1 ? 9 : 6, color, fillColor: "#fff", fillOpacity: 1, weight: 3 }).addTo(routeLayer).bindPopup(`<strong>${index === 0 ? "البداية" : index === coords.length - 1 ? "النهاية" : "محطة"}</strong><br>${route.stops?.[index] || "محطة وصلني"}`));
  const midpoint = coords[Math.min(1, coords.length - 1)];
  busMarker = L.marker(midpoint, { icon: L.divIcon({ className: "bus-map-marker", html: "🚌", iconSize: [38,38] }) }).addTo(map).bindPopup(`<strong>${route.line}</strong><br>الباص في الطريق الآن`);
  map.fitBounds(L.latLngBounds(coords), { padding: [35,35] });
}

function selectRoute(route, scroll = true) {
  selectedRoute = route; drawRoute(route); startLiveTracking(route);
  if (scroll) document.getElementById("map").scrollIntoView({ behavior: "smooth" });
}
async function showRoute(id) { try { const result = await api(`/routes/${id}`); selectRoute(result.data); } catch (error) { toast(error.message); } }
window.showRoute = showRoute;

function startLiveTracking(route) {
  clearInterval(liveTimer); let eta = Number(route.duration) || 23, tick = 0;
  document.getElementById("liveStatus").textContent = `${route.line} • ${route.from} → ${route.to}`;
  document.getElementById("liveMessage").textContent = routeBusy(route) ? "ازدحام مرتفع — ننصحك بمراجعة البدائل." : "الباص يتحرك على المسار المحدد. الحالة مستقرة.";
  document.getElementById("liveEta").textContent = eta;
  liveTimer = setInterval(() => { tick++; if (tick % 5 === 0 && eta > 1) eta--; document.getElementById("liveEta").textContent = eta; }, 1000);
}

window.openTicket = async function(id) {
  selectedRoute = allRoutes.find(r => r.id === id); if (!selectedRoute) return;
  document.getElementById("ticketDetails").innerHTML = `<div class="ticket-summary"><strong>${selectedRoute.line}</strong><br>${selectedRoute.from} → ${selectedRoute.to}<br>الموعد: ${selectedRoute.nextDeparture}<br>المدة: ${selectedRoute.duration} دقيقة<br>التكلفة: ${selectedRoute.fare} جنيه</div>`;
  document.getElementById("ticketResult").innerHTML = ""; document.getElementById("ticketModal").classList.add("show");
};
async function confirmTicket() {
  if (!selectedRoute) return;
  try { const result = await api("/tickets", { method:"POST", body:JSON.stringify({ routeId:selectedRoute.id }) }); document.getElementById("ticketResult").innerHTML = `<div class="ticket-success">تم الحجز بنجاح 🎉<br>كود التذكرة: <strong>${result.data.id}</strong></div>`; toast("تم حجز التذكرة بنجاح"); }
  catch (error) { document.getElementById("ticketResult").innerHTML = `<div class="ticket-success">${error.message}</div>`; }
}

async function loadNotifications() {
  try { const result = await api("/notifications"), list = document.getElementById("notificationList"); document.getElementById("notificationCount").textContent = result.data.length; list.innerHTML = result.data.map(item => `<div class="notification-item"><span class="dot"></span><div><p>${item.text}</p><small>${item.time}</small></div></div>`).join(""); }
  catch { document.getElementById("notificationList").innerHTML = `<div class="loading">لا توجد تنبيهات جديدة.</div>`; }
}

function locateUser() {
  if (!navigator.geolocation) { toast("المتصفح لا يدعم تحديد الموقع"); return; }
  navigator.geolocation.getCurrentPosition(position => { const {latitude,longitude}=position.coords; map.setView([latitude,longitude],15); if(userMarker) map.removeLayer(userMarker); userMarker=L.marker([latitude,longitude]).addTo(map).bindPopup("📍 موقعك الحالي").openPopup(); toast("تم تحديد موقعك على الخريطة"); }, () => toast("اسمحي للمتصفح باستخدام Location لتحديد موقعك."));
}
function toast(message) { const el=document.getElementById("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>el.classList.remove("show"),2800); }

function saveAccessibility() { const settings={large:document.getElementById("largeTextToggle").checked,contrast:document.getElementById("contrastToggle").checked,motion:document.getElementById("motionToggle").checked,accessible:document.getElementById("accessibleToggle").checked}; localStorage.setItem("waslniAccessibility",JSON.stringify(settings)); applyAccessibility(settings); }
function applyAccessibility(s) { document.body.classList.toggle("large-text",!!s.large); document.body.classList.toggle("high-contrast",!!s.contrast); document.body.classList.toggle("reduce-motion",!!s.motion); if(document.getElementById("statusFilter")){ document.getElementById("statusFilter").value=s.accessible?"accessible":"all"; renderRoutes(allRoutes); } }
function loadAccessibility() { try { const s=JSON.parse(localStorage.getItem("waslniAccessibility"))||{}; ["large","contrast","motion","accessible"].forEach(k=>{ const el=document.getElementById(k+"Toggle"); if(el) el.checked=!!s[k]; }); applyAccessibility(s); } catch {} }
function closeModals() { document.querySelectorAll(".modal").forEach(m=>m.classList.remove("show")); }

document.getElementById("searchBtn").addEventListener("click", searchRoutes);
document.getElementById("swapBtn").addEventListener("click",()=>{ const temp=fromInput.value; fromInput.value=toInput.value; toInput.value=temp; });
document.getElementById("statusFilter").addEventListener("change",()=>renderRoutes(allRoutes));
document.getElementById("refreshRoutes").addEventListener("click",()=>{ loadRoutes(); toast("تم تحديث الرحلات"); });
document.getElementById("nearbyBtn").addEventListener("click",()=>{ locateUser(); document.getElementById("map").scrollIntoView({behavior:"smooth"}); });
document.getElementById("fitBtn").addEventListener("click",()=>{ if(routeLayer) map.fitBounds(routeLayer.getBounds(),{padding:[35,35]}); });
document.getElementById("locateBtn").addEventListener("click",locateUser);
document.getElementById("notificationBtn").addEventListener("click",()=>{ document.getElementById("notificationPanel").classList.add("open"); document.getElementById("notificationPanel").setAttribute("aria-hidden","false"); loadNotifications(); });
document.getElementById("closeNotifications").addEventListener("click",()=>{ document.getElementById("notificationPanel").classList.remove("open"); document.getElementById("notificationPanel").setAttribute("aria-hidden","true"); });
document.getElementById("closeModal").addEventListener("click",closeModals); document.getElementById("confirmTicket").addEventListener("click",confirmTicket);
document.getElementById("accessibilityBtn").addEventListener("click",()=>document.getElementById("accessibilityModal").classList.add("show"));
document.getElementById("openAccessibility").addEventListener("click",()=>document.getElementById("accessibilityModal").classList.add("show"));
document.getElementById("closeAccessibility").addEventListener("click",closeModals);
["largeTextToggle","contrastToggle","motionToggle","accessibleToggle"].forEach(id=>document.getElementById(id).addEventListener("change",saveAccessibility));
document.getElementById("resetAccessibility").addEventListener("click",()=>{ localStorage.removeItem("waslniAccessibility"); ["largeTextToggle","contrastToggle","motionToggle","accessibleToggle"].forEach(id=>document.getElementById(id).checked=false); applyAccessibility({}); toast("تمت إعادة الإعدادات"); });
document.getElementById("menuBtn").addEventListener("click",()=>{ const nav=document.getElementById("mainNav"), btn=document.getElementById("menuBtn"); nav.classList.toggle("mobile-open"); btn.setAttribute("aria-expanded",nav.classList.contains("mobile-open")); });
document.addEventListener("keydown",e=>{ if(e.key==="Enter"&&(document.activeElement===fromInput||document.activeElement===toInput)) searchRoutes(); if(e.key==="Escape") closeModals(); });

initMap(); loadRoutes(); loadNotifications(); loadAccessibility();