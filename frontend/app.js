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
  const walletBalance = getWalletBalance();
  document.getElementById("ticketDetails").innerHTML = `<div class="ticket-summary"><strong>${selectedRoute.line}</strong><br>${selectedRoute.from} → ${selectedRoute.to}<br>الموعد: ${selectedRoute.nextDeparture}<br>المدة: ${selectedRoute.duration} دقيقة<br>التكلفة: ${selectedRoute.fare} جنيه</div>
    <div class="payment-box"><h4>طريقة الدفع</h4><label class="payment-option"><input type="radio" name="paymentMethod" value="wallet" checked> 💳 المحفظة الإلكترونية <span>الرصيد: ${walletBalance} ج</span></label><label class="payment-option"><input type="radio" name="paymentMethod" value="cash"> 💵 كاش عند الصعود</label><small>المحفظة هنا تجريبية للعرض، ويمكن ربطها لاحقًا ببوابة دفع حقيقية.</small></div>`;
  document.getElementById("ticketResult").innerHTML = ""; document.getElementById("ticketModal").classList.add("show");
};

async function confirmTicket() {
  if (!selectedRoute) return;
  const payment = document.querySelector('input[name="paymentMethod"]:checked')?.value || "cash";
  const price = Number(selectedRoute.fare) || 0;
  if (payment === "wallet" && getWalletBalance() < price) {
    document.getElementById("ticketResult").innerHTML = `<div class="ticket-warning">الرصيد غير كافٍ. اشحني المحفظة أولًا أو اختاري الدفع كاش.</div>`;
    return;
  }
  try {
    const result = await api("/tickets", { method:"POST", body:JSON.stringify({ routeId:selectedRoute.id, paymentMethod:payment }) });
    if (payment === "wallet") setWalletBalance(getWalletBalance() - price);
    const methodLabel = payment === "wallet" ? "المحفظة الإلكترونية" : "كاش";
    document.getElementById("ticketResult").innerHTML = `<div class="ticket-success">تم الحجز بنجاح 🎉<br>كود التذكرة: <strong>${result.data.id}</strong><br>الدفع: ${methodLabel}${payment === "wallet" ? `<br>الرصيد المتبقي: ${getWalletBalance()} ج` : ""}</div>`;
    updateWalletUI(); toast("تم حجز التذكرة بنجاح");
  } catch (error) { document.getElementById("ticketResult").innerHTML = `<div class="ticket-warning">${error.message}</div>`; }
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

function getWalletBalance(){ return Number(localStorage.getItem("waslniWalletBalance") ?? 120); }
function setWalletBalance(value){ localStorage.setItem("waslniWalletBalance",String(Math.max(0,Number(value)||0))); }
function updateWalletUI(){ const el=document.getElementById("walletBalance"); if(el) el.textContent=`${getWalletBalance()} ج`; }
function showWalletMessage(message){ const el=document.getElementById("walletMessage"); if(el){el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2200);} }

function injectEnhancementStyles(){
  if(document.getElementById("waslniEnhancementStyles")) return;
  const style=document.createElement("style"); style.id="waslniEnhancementStyles";
  style.textContent=`
  .enh-section{margin-top:42px;margin-bottom:42px}.enh-header{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:20px}.enh-header h2{margin:4px 0}.enh-header p{margin:0;color:#71808b}.audience-switch{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.audience-card,.wallet-card,.vehicle-card,.testimonial-card,.normal-feature{background:#fff;border:1px solid #dce7ec;border-radius:18px;padding:18px;box-shadow:0 7px 25px #102a4310}.audience-card{cursor:pointer;transition:.2s}.audience-card.active{border-color:#168c8c;box-shadow:0 8px 28px #168c8c20}.audience-card h3{margin:6px 0}.audience-card p{color:#71808b;font-size:13px;margin:0}.normal-features-grid,.vehicle-grid,.testimonial-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.normal-feature h3,.vehicle-card h3,.testimonial-card h3{margin:7px 0}.normal-feature p,.vehicle-card p,.testimonial-card p{color:#71808b;font-size:12px}.feature-icon{font-size:28px}.wallet-card{display:grid;grid-template-columns:1.2fr 1fr;gap:18px;align-items:center;background:linear-gradient(135deg,#102a43,#168c8c);color:#fff;border:0}.wallet-balance{font-size:32px;font-weight:800;margin:5px 0}.wallet-actions{display:flex;gap:8px;flex-wrap:wrap}.wallet-actions input{width:130px;padding:10px;border-radius:10px;border:0;font-family:inherit}.wallet-actions button{padding:10px 14px;border:0;border-radius:10px;background:#fff;color:#102a43;font-weight:700;cursor:pointer}.wallet-note{font-size:10px;opacity:.8}.vehicle-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}.vehicle-toolbar select{padding:11px;border:1px solid #dce7ec;border-radius:10px;font-family:inherit;background:#fff}.vehicle-card .vehicle-top{display:flex;justify-content:space-between;gap:8px}.vehicle-badge{background:#e8f6f6;color:#168c8c;border-radius:20px;padding:4px 9px;font-size:10px}.capacity{display:flex;justify-content:space-between;background:#f6fafb;border-radius:10px;padding:10px;margin:10px 0;font-size:12px}.driver-line{display:flex;gap:8px;align-items:center;font-size:12px}.vehicle-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.vehicle-tags span{background:#f0f4f6;border-radius:20px;padding:4px 8px;font-size:10px}.payment-box{margin-top:15px;padding:14px;background:#f6fafb;border:1px solid #dce7ec;border-radius:14px}.payment-box h4{margin:0 0 9px}.payment-option{display:flex;align-items:center;gap:8px;padding:9px 0;font-size:12px}.payment-option span{margin-right:auto;color:#168c8c;font-weight:700}.payment-box small{color:#71808b;font-size:10px}.ticket-warning{margin-top:12px;padding:10px;border-radius:10px;background:#fff5e8;color:#8a5a00;font-size:12px}.testimonials-note{font-size:10px;color:#71808b;margin-top:10px}.testimonial-card .stars{letter-spacing:2px}.testimonial-card small{color:#168c8c}.fleet-filter-empty{grid-column:1/-1;text-align:center;padding:25px;color:#71808b}.user-type-pill{display:inline-block;background:#e8f6f6;color:#168c8c;border-radius:20px;padding:5px 10px;font-size:11px;font-weight:700}
  @media(max-width:850px){.normal-features-grid,.vehicle-grid,.testimonial-grid{grid-template-columns:1fr 1fr}.wallet-card{grid-template-columns:1fr}.enh-header{align-items:flex-start;flex-direction:column}}
  @media(max-width:560px){.normal-features-grid,.vehicle-grid,.testimonial-grid,.audience-switch{grid-template-columns:1fr}.wallet-balance{font-size:27px}}
  `; document.head.appendChild(style);
}

function addEnhancementSections(){
  if(document.getElementById("waslniEnhancements")) return;
  const main=document.querySelector("main#home"); const features=document.getElementById("features");
  if(!main||!features) return;
  const wrap=document.createElement("div"); wrap.id="waslniEnhancements";
  wrap.innerHTML=`
  <section class="container enh-section" id="userTypes"><div class="enh-header"><div><span>FOR EVERY RIDER</span><h2>اختاري تجربة الاستخدام المناسبة لك</h2><p>وصلني مصمم للمستخدم العادي ولذوي الاحتياجات الخاصة، وكل فئة لها أدوات مناسبة.</p></div><span class="user-type-pill" id="currentUserType">👤 مستخدم عادي</span></div><div class="audience-switch"><article class="audience-card active" data-type="normal"><div class="feature-icon">👤</div><h3>المستخدم العادي</h3><p>بحث أسرع، مقارنة الرحلات، اختيار المركبة، الدفع بالمحفظة أو كاش، والتنبيهات.</p></article><article class="audience-card" data-type="access"><div class="feature-icon">♿</div><h3>ذوو الاحتياجات الخاصة</h3><p>فلترة المركبات المجهزة، كرسي متحرك، منحدر، إرشادات صوتية، مقعد أولوية وشاشة مرئية.</p></article></div></section>

  <section class="container enh-section" id="normalFeatures"><div class="enh-header"><div><span>SMART RIDER</span><h2>مميزات إضافية للمستخدمين العاديين</h2><p>أدوات عملية تساعدك تختار الرحلة المناسبة قبل ما تتحرك.</p></div></div><div class="normal-features-grid">
    <article class="normal-feature"><div class="feature-icon">🔎</div><h3>مقارنة الرحلات</h3><p>قارن الوقت والتكلفة والازدحام قبل اختيار الرحلة.</p></article>
    <article class="normal-feature"><div class="feature-icon">⏰</div><h3>تذكير بالرحلة</h3><p>احفظ الرحلة المفضلة واحصل على تنبيه قبل موعدها.</p></article>
    <article class="normal-feature"><div class="feature-icon">📍</div><h3>أقرب محطة</h3><p>اعرف أقرب محطة حسب موقعك الحالي.</p></article>
    <article class="normal-feature"><div class="feature-icon">🚦</div><h3>حالة الطريق</h3><p>شوف مستوى الازدحام واقترح بديلًا عند الحاجة.</p></article>
    <article class="normal-feature"><div class="feature-icon">⭐</div><h3>المفضلة</h3><p>احتفظ بالخطوط والمحطات التي تستخدمها كثيرًا.</p></article>
    <article class="normal-feature"><div class="feature-icon">🧾</div><h3>سجل الرحلات</h3><p>راجع التذاكر السابقة وطريقة الدفع المستخدمة.</p></article>
  </div></section>

  <section class="container enh-section" id="wallet"><div class="enh-header"><div><span>DIGITAL WALLET</span><h2>محفظتي الإلكترونية 💳</h2><p>ادفع إلكترونيًا من رصيدك أو اختار كاش عند الحجز.</p></div></div><div class="wallet-card"><div><small>الرصيد المتاح</small><div class="wallet-balance" id="walletBalance">120 ج</div><div class="wallet-note">محفظة تجريبية — الرصيد محفوظ على هذا الجهاز فقط.</div></div><div><div class="wallet-actions"><input id="walletTopup" type="number" min="1" step="1" placeholder="قيمة الشحن"><button id="walletTopupBtn">+ شحن الرصيد</button></div><div id="walletMessage" class="wallet-note" style="margin-top:10px"></div></div></div></section>

  <section class="container enh-section" id="vehicles"><div class="enh-header"><div><span>ALL VEHICLES</span><h2>اختار نوع المواصلة والمركبة 🚌</h2><p>كل مركبة موضح لها النوع، سعة الأفراد، المقاعد المتاحة، ونوع السائق.</p></div></div><div class="vehicle-toolbar"><select id="vehicleTypeFilter"><option value="all">كل أنواع المواصلات</option><option value="bus">أتوبيس</option><option value="microbus">ميكروباص</option><option value="car">سيارة</option><option value="motorcycle">دراجة بخارية</option></select><select id="driverGenderFilter"><option value="all">كل السائقين</option><option value="male">سائق</option><option value="female">سائقة</option></select><select id="capacityFilter"><option value="all">كل السعات</option><option value="small">1–4 أفراد</option><option value="medium">5–14 فرد</option><option value="large">15+ فرد</option></select></div><div class="vehicle-grid" id="vehicleGrid"></div></section>

  <section class="container enh-section" id="customerFeedback"><div class="enh-header"><div><span>USER FEEDBACK</span><h2>آراء العملاء ⭐</h2><p>آراء تجريبية مضافة للعرض داخل الـMVP وليست تقييمات حقيقية موثقة.</p></div></div><div class="testimonial-grid" id="testimonialGrid"></div><div class="testimonials-note">مهم: الأسماء والتعليقات التالية Demo Data لا تمثل عملاء حقيقيين أو نتائج استطلاع فعلي.</div></section>`;
  main.insertBefore(wrap,features);

  document.querySelectorAll(".audience-card").forEach(card=>card.addEventListener("click",()=>{
    document.querySelectorAll(".audience-card").forEach(c=>c.classList.remove("active")); card.classList.add("active");
    const access=card.dataset.type==="access"; document.getElementById("currentUserType").textContent=access?"♿ تجربة وصول مخصصة":"👤 مستخدم عادي";
    document.getElementById("normalFeatures").scrollIntoView({behavior:"smooth",block:"start"});
    if(access) document.getElementById("accessibility").scrollIntoView({behavior:"smooth",block:"start"});
  }));

  const vehicles=[
    {type:"bus",label:"أتوبيس",icon:"🚌",id:"BUS-12",capacity:30,available:12,driver:"محمود",gender:"male",features:["مقاعد أولوية","تتبع مباشر","شاشة مرئية"]},
    {type:"bus",label:"أتوبيس Accessible",icon:"🚌♿",id:"BUS-A7",capacity:24,available:9,driver:"سارة",gender:"female",features:["منحدر","مكان كرسي متحرك","إرشادات صوتية"]},
    {type:"microbus",label:"ميكروباص",icon:"🚐",id:"MIC-21",capacity:14,available:5,driver:"أحمد",gender:"male",features:["تكييف","تتبع مباشر","حجز إلكتروني"]},
    {type:"microbus",label:"ميكروباص Accessible",icon:"🚐♿",id:"MIC-A4",capacity:11,available:4,driver:"نور",gender:"female",features:["منحدر","مقعد أولوية","شاشة مرئية"]},
    {type:"car",label:"سيارة",icon:"🚗",id:"CAR-31",capacity:4,available:2,driver:"محمد",gender:"male",features:["حجز مسبق","دفع إلكتروني","تكييف"]},
    {type:"car",label:"سيارة",icon:"🚙",id:"CAR-32",capacity:4,available:3,driver:"ملك",gender:"female",features:["حجز مسبق","دفع إلكتروني","تكييف"]},
    {type:"motorcycle",label:"دراجة بخارية",icon:"🏍️",id:"MOTO-08",capacity:1,available:1,driver:"يوسف",gender:"male",features:["رحلة فردية","حجز مسبق","تتبع مباشر"]}
  ];
  function renderVehicles(){
    const type=document.getElementById("vehicleTypeFilter").value, gender=document.getElementById("driverGenderFilter").value, cap=document.getElementById("capacityFilter").value;
    const list=vehicles.filter(v=>{
      const capOk=cap==="all"||(cap==="small"&&v.capacity<=4)||(cap==="medium"&&v.capacity>=5&&v.capacity<=14)||(cap==="large"&&v.capacity>=15);
      return (type==="all"||v.type===type)&&(gender==="all"||v.gender===gender)&&capOk;
    });
    document.getElementById("vehicleGrid").innerHTML=list.length?list.map(v=>`<article class="vehicle-card"><div class="vehicle-top"><span class="vehicle-badge">${v.id}</span><span>${v.icon}</span></div><h3>${v.label}</h3><div class="driver-line">👤 ${v.gender==="female"?"سائقة":"سائق"}: <strong>${v.driver}</strong></div><div class="capacity"><span>👥 سعة المركبة: <strong>${v.capacity} فرد</strong></span><span>🟢 متاح: <strong>${v.available}</strong></span></div><div class="vehicle-tags">${v.features.map(f=>`<span>${f}</span>`).join("")}</div></article>`).join(""):`<div class="fleet-filter-empty">لا توجد مركبات مطابقة للفلاتر.</div>`;
  }
  ["vehicleTypeFilter","driverGenderFilter","capacityFilter"].forEach(id=>document.getElementById(id).addEventListener("change",renderVehicles)); renderVehicles();

  const feedback=[
    {name:"أحمد — طالب",text:"عجبني إني أعرف وقت الرحلة والتكلفة قبل ما أتحرك.",stars:5},
    {name:"سارة — موظفة",text:"اختيار وسيلة الدفع كاش أو محفظة خلّى الحجز أوضح.",stars:5},
    {name:"محمد — طالب",text:"الخريطة والتتبع المباشر من أكتر الحاجات المفيدة بالنسبة لي.",stars:4},
    {name:"نور — موظفة",text:"فكرة فلترة المركبات حسب السعة ونوعها سهلة جدًا.",stars:5},
    {name:"مريم — طالبة",text:"التنبيهات والمفضلة بيوفروا وقت في كل رحلة.",stars:5},
    {name:"يوسف — موظف",text:"اختيارات Accessibility واضحة وسهلة الاستخدام.",stars:4}
  ];
  document.getElementById("testimonialGrid").innerHTML=feedback.map(f=>`<article class="testimonial-card"><div class="stars">${"★".repeat(f.stars)}${"☆".repeat(5-f.stars)}</div><p>“${f.text}”</p><small>${f.name}</small></article>`).join("");
}

function initWallet(){
  updateWalletUI();
  const btn=document.getElementById("walletTopupBtn"), input=document.getElementById("walletTopup");
  if(btn) btn.addEventListener("click",()=>{ const amount=Number(input.value); if(!amount||amount<1){showWalletMessage("اكتبي قيمة صحيحة للشحن.");return;} setWalletBalance(getWalletBalance()+amount); input.value=""; updateWalletUI(); showWalletMessage(`تمت إضافة ${amount} ج إلى المحفظة التجريبية.`); });
}

initMap(); loadRoutes(); loadNotifications(); loadAccessibility();

injectEnhancementStyles(); addEnhancementSections(); initWallet();
