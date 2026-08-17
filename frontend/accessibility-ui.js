function vehicleTag(vehicle){const tags=[];if(vehicle.ramp)tags.push("🛤️ Ramp");if(vehicle.lift)tags.push("🛗 Lift");if(vehicle.audio)tags.push("🔊 صوت");if(vehicle.visual)tags.push("👁️ شاشة");if(vehicle.priority)tags.push("🪑 أولوية");if(vehicle.charging)tags.push("🔋 USB");return tags.map(t=>`<span>${t}</span>`).join("")}

function renderAccessibleFleet(list=accessibleVehicles){
  const grid=document.getElementById("accessibleFleetGrid");
  if(!grid)return;
  document.getElementById("vehicleCount").textContent=list.length;
  if(!list.length){grid.innerHTML='<div class="loading">لا توجد مركبات مطابقة للاختيار الحالي.</div>';return;}
  grid.innerHTML=list.map(v=>`<article class="fleet-card" data-vehicle="${v.id}"><div class="fleet-card-head"><div class="vehicle-icon">🚌</div><span class="vehicle-status ${v.status==='في الطريق'?'route':''}">${v.status}</span></div><h3>${v.type}</h3><div class="vehicle-id">${v.id} • ${v.line} • وصول خلال ${v.eta} دقائق</div><div class="fleet-meta"><div><strong>${v.wheelchair}</strong> كرسي متحرك</div><div><strong>${v.seats}</strong> مقاعد أولوية</div><div><strong>${v.capacity}</strong> إجمالي المقاعد</div><div><strong>${v.eta} د</strong> وقت الوصول</div></div><div class="vehicle-tags">${vehicleTag(v)}</div><div class="vehicle-actions"><button class="secondary-btn" onclick="reserveAccessibleVehicle('${v.id}')">♿ اختار المركبة</button><button class="outline-btn" onclick="showVehicleDetails('${v.id}')">التفاصيل</button></div></article>`).join("");
}
window.reserveAccessibleVehicle=function(id){const v=accessibleVehicles.find(x=>x.id===id);if(!v)return;localStorage.setItem("waslniPreferredVehicle",id);document.querySelectorAll(".fleet-card").forEach(c=>c.classList.remove("highlight"));document.querySelector(`[data-vehicle="${id}"]`)?.classList.add("highlight");toast(`تم اختيار ${v.type} — ${v.line} ♿`);};
window.showVehicleDetails=function(id){const v=accessibleVehicles.find(x=>x.id===id);if(!v)return;document.getElementById("ticketDetails").innerHTML=`<div class="ticket-summary"><strong>${v.type}</strong><br>المركبة: ${v.id}<br>الخط: ${v.line}<br>الوصول المتوقع: ${v.eta} دقيقة<br>أماكن الكراسي: ${v.wheelchair}<br>المميزات: ${v.ramp?'Ramp، ':''}${v.lift?'Lift، ':''}${v.audio?'إرشاد صوتي، ':''}${v.visual?'شاشة مرئية، ':''}${v.charging?'USB، ':''}مقاعد أولوية</div>`;document.getElementById("ticketResult").innerHTML="";document.getElementById("confirmTicket").style.display="none";document.getElementById("ticketModal").classList.add("show");};
function filterFleet(){const feature=document.getElementById("vehicleFeatureFilter").value;let list=accessibleVehicles;if(feature!=="all")list=list.filter(v=>v[feature]);if(window.accessibleOnly)list=list.filter(v=>v.status!=="في الطريق");renderAccessibleFleet(list);}

document.addEventListener("DOMContentLoaded",()=>{
  renderAccessibleFleet();
  const feature=document.getElementById("vehicleFeatureFilter");
  const only=document.getElementById("showAccessibleOnly");
  feature?.addEventListener("change",filterFleet);
  only?.addEventListener("click",()=>{window.accessibleOnly=!window.accessibleOnly;only.classList.toggle("active",window.accessibleOnly);filterFleet();toast(window.accessibleOnly?"عرض المركبات المتاحة الآن":"عرض كل المركبات");});
  document.getElementById("applyAccessPlan")?.addEventListener("click",()=>{
    const needs={wheelchair:document.getElementById("needWheelchair").checked,ramp:document.getElementById("needRamp").checked,audio:document.getElementById("needAudio").checked,visual:document.getElementById("needVisual").checked,priority:document.getElementById("needPriority").checked,charging:document.getElementById("needCharging").checked};
    const active=Object.keys(needs).filter(k=>needs[k]);
    const result=document.getElementById("accessPlanResult");
    if(!active.length){result.textContent="اختاري احتياجًا واحدًا على الأقل للحصول على ترشيح مخصص.";result.classList.add("show");return;}
    const matches=accessibleVehicles.filter(v=>active.every(k=>v[k]));
    result.innerHTML=matches.length?`أفضل اختيار: <strong>${matches[0].type}</strong> — ${matches[0].line} — وصول خلال ${matches[0].eta} دقائق. وجدنا ${matches.length} مركبات مطابقة.`:"لم نجد مركبة تجمع كل الاختيارات. جربي إزالة اختيار واحد أو استخدمي فلتر المركبات.";
    result.classList.add("show");
    if(matches.length){renderAccessibleFleet(matches);document.getElementById("accessible-fleet").scrollIntoView({behavior:"smooth"});}
  });
  initWaslniShowcase();
});

function initWaslniShowcase(){
  if(document.getElementById("waslniShowcase"))return;
  const style=document.createElement("style");
  style.id="waslniShowcaseStyles";
  style.textContent=`
  body{background:radial-gradient(circle at 12% 12%,rgba(224,122,63,.12),transparent 23%),radial-gradient(circle at 88% 18%,rgba(154,93,224,.13),transparent 24%),linear-gradient(180deg,#ffffff 0%,#f4fbfb 55%,#eef7f8 100%)}
  .hero{position:relative;isolation:isolate;overflow:hidden;border-radius:0 0 42px 42px}.hero:before,.hero:after{content:"";position:absolute;border-radius:50%;filter:blur(2px);z-index:-1;pointer-events:none}.hero:before{width:360px;height:360px;background:rgba(22,140,140,.12);top:-120px;right:-130px}.hero:after{width:280px;height:280px;background:rgba(224,122,63,.11);bottom:-100px;left:-90px}.showcase-section{margin:0 auto 72px;width:min(1180px,calc(100% - 32px));position:relative}.showcase-hero{display:grid;grid-template-columns:1.15fr .85fr;gap:20px;background:linear-gradient(135deg,#102a43 0%,#155e68 55%,#168c8c 100%);color:#fff;border-radius:30px;padding:30px;overflow:hidden;box-shadow:0 24px 60px rgba(16,42,67,.18)}.showcase-hero:after{content:"🏍️";position:absolute;font-size:150px;left:15px;bottom:-38px;opacity:.12;transform:rotate(-10deg)}.showcase-copy h2{font-size:34px;margin:8px 0}.showcase-copy p{color:#d8eef0;line-height:1.9;margin:0 0 18px}.showcase-pills{display:flex;gap:8px;flex-wrap:wrap}.showcase-pills span{background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);padding:7px 11px;border-radius:20px;font-size:10px}.moto-card{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:24px;padding:20px;backdrop-filter:blur(8px)}.moto-card .moto-icon{font-size:68px;text-align:center;filter:drop-shadow(0 12px 15px rgba(0,0,0,.18))}.moto-card h3{margin:5px 0}.moto-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.moto-meta div{background:rgba(255,255,255,.1);padding:10px;border-radius:12px;font-size:10px}.moto-meta strong{display:block;font-size:15px;color:#fff}.offer-grid,.rider-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.offer-card,.rider-card{background:#fff;border:1px solid #dce7ec;border-radius:20px;padding:18px;box-shadow:0 10px 30px rgba(16,42,67,.06);transition:.2s}.offer-card:hover,.rider-card:hover{transform:translateY(-4px);box-shadow:0 18px 35px rgba(16,42,67,.1)}.offer-badge{display:inline-block;background:#fff1e8;color:#b85d2b;border-radius:20px;padding:5px 9px;font-size:10px;font-weight:800}.offer-card h3{margin:12px 0 5px}.offer-card p,.rider-card p{color:#71808b;font-size:11px;line-height:1.8}.offer-code{font-size:22px;font-weight:800;color:#168c8c}.rider-head{display:flex;align-items:center;gap:10px}.rider-avatar{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#eef7f7;font-size:23px}.rider-card small{color:#168c8c;font-weight:800}.vehicle-filter-bar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}.vehicle-filter-bar button{border:1px solid #dce7ec;background:#fff;color:#102a43;border-radius:12px;padding:9px 13px;font-weight:800;font-size:11px}.vehicle-filter-bar button.active{background:#168c8c;color:#fff;border-color:#168c8c}.showcase-title{margin-bottom:18px}.showcase-title span{color:#168c8c;font-size:10px;font-weight:800}.showcase-title h2{margin:4px 0;font-size:27px}.showcase-title p{margin:0;color:#71808b;font-size:11px}.vehicle-demo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.vehicle-demo{background:#fff;border:1px solid #dce7ec;border-radius:18px;padding:16px}.vehicle-demo .icon{font-size:35px}.vehicle-demo h3{margin:7px 0;font-size:14px}.vehicle-demo p{margin:0;color:#71808b;font-size:10px;line-height:1.8}.vehicle-demo .capacity{margin-top:10px;background:#f4f9fa;padding:8px;border-radius:10px;font-size:10px}.vehicle-demo .capacity strong{color:#168c8c}.demo-note{font-size:9px;color:#8a6d1d;background:#fff8e7;border:1px solid #efd889;border-radius:10px;padding:8px;margin-top:10px}
  @media(max-width:900px){.showcase-hero{grid-template-columns:1fr}.offer-grid,.rider-grid{grid-template-columns:1fr 1fr}.vehicle-demo-grid{grid-template-columns:1fr 1fr}}
  @media(max-width:560px){.showcase-copy h2{font-size:27px}.offer-grid,.rider-grid,.vehicle-demo-grid{grid-template-columns:1fr}.showcase-hero{padding:22px}}
  `;
  document.head.appendChild(style);

  const section=document.createElement("section");
  section.id="waslniShowcase";
  section.className="showcase-section";
  section.innerHTML=`
    <div class="showcase-hero">
      <div class="showcase-copy"><span class="eyebrow" style="color:#9de2df">SMART RIDES • WASLNI</span><h2>مواصلات أسرع… حتى لو مستعجلة 🏍️</h2><p>اختاري الدراجة البخارية للرحلات القصيرة، شوفي وقت الوصول والسعر، واستفيدي من عروض تجريبية داخل وصلني.</p><div class="showcase-pills"><span>🏍️ دراجة بخارية</span><span>⏱️ وصول سريع</span><span>💳 دفع إلكتروني أو كاش</span><span>🧑‍✈️ سائق / سائقة</span></div></div>
      <div class="moto-card"><div class="moto-icon">🏍️</div><h3>Moto 12 • حي الشرق → الجامعة</h3><div class="moto-meta"><div><strong>12 د</strong>مدة الرحلة</div><div><strong>10 ج</strong>السعر</div><div><strong>1</strong>راكب</div><div><strong>09:30</strong>الرحلة القادمة</div></div></div>
    </div>
    <div class="showcase-title" style="margin-top:32px"><span>🔥 OFFERS</span><h2>عروض تخلي الرحلة أوفر</h2><p>عروض تجريبية للعرض داخل المشروع — وليست عروضًا تجارية حقيقية.</p></div>
    <div class="offer-grid">
      <article class="offer-card"><span class="offer-badge">🏍️ MOTORCYCLE</span><h3>خصم أول 3 رحلات</h3><p>خصم تجريبي على أول ثلاث رحلات بالدراجة البخارية.</p><div class="offer-code">20% OFF</div></article>
      <article class="offer-card"><span class="offer-badge">🎓 STUDENTS</span><h3>عرض الطالب</h3><p>خصم تجريبي للطلاب على الرحلات المختارة.</p><div class="offer-code">15% OFF</div></article>
      <article class="offer-card"><span class="offer-badge">⚡ QUICK RIDE</span><h3>رحلة الجامعة</h3><p>وفر تجريبي 3 جنيه عند اختيار Moto 12 قبل 9 صباحًا.</p><div class="offer-code">-3 ج</div></article>
    </div>
    <div class="showcase-title" style="margin-top:38px"><span>🏍️ RIDERS DEMO</span><h2>ركاب بيستخدموا الدراجة البخارية</h2><p>بيانات وهمية Demo Data للعرض فقط.</p></div>
    <div class="rider-grid">
      <article class="rider-card"><div class="rider-head"><div class="rider-avatar">👩</div><div><strong>سارة</strong><br><small>طالبة • Moto 12</small></div></div><p>اختارت الدراجة للوصول للجامعة بسرعة في وقت الذروة.</p><small>⭐ تقييم تجريبي: 4.9/5</small></article>
      <article class="rider-card"><div class="rider-head"><div class="rider-avatar">👨</div><div><strong>عمر</strong><br><small>موظف • Moto 18</small></div></div><p>استخدم رحلة قصيرة من حي العرب إلى حي المناخ.</p><small>⭐ تقييم تجريبي: 4.8/5</small></article>
      <article class="rider-card"><div class="rider-head"><div class="rider-avatar">👩</div><div><strong>مريم</strong><br><small>موظفة • Moto 12</small></div></div><p>فضّلت معرفة السعر ووقت الوصول قبل بدء الرحلة.</p><small>⭐ تقييم تجريبي: 4.9/5</small></article>
    </div>
    <div class="showcase-title" style="margin-top:38px"><span>🚗 VEHICLE TYPES</span><h2>اختاري نوع المواصلات</h2><p>كل مركبة لها سعة وعدد ركاب مختلف.</p></div>
    <div class="vehicle-filter-bar"><button class="active" data-vtype="all">الكل</button><button data-vtype="أتوبيس">🚌 أتوبيس</button><button data-vtype="ميكروباص">🚐 ميكروباص</button><button data-vtype="سيارة">🚗 سيارة</button><button data-vtype="دراجة بخارية">🏍️ دراجة بخارية</button></div>
    <div class="vehicle-demo-grid" id="vehicleDemoGrid"></div>
    <div class="demo-note">⚠️ جميع أسماء الركاب والتقييمات والأرقام في هذا القسم بيانات تجريبية Demo Data للعرض وليست شهادات عملاء حقيقيين.</div>
  `;
  const routes=document.getElementById("routes");
  routes?.parentNode.insertBefore(section,routes);

  const vehicles=[
    {type:"أتوبيس",icon:"🚌",capacity:40,seats:17,driver:"رجل",line:"خط 2"},
    {type:"ميكروباص",icon:"🚐",capacity:14,seats:6,driver:"سيدة",line:"خط 4"},
    {type:"سيارة",icon:"🚗",capacity:4,seats:2,driver:"سيدة",line:"خط 9"},
    {type:"دراجة بخارية",icon:"🏍️",capacity:1,seats:1,driver:"رجل",line:"Moto 12"},
    {type:"دراجة بخارية",icon:"🏍️",capacity:1,seats:1,driver:"سيدة",line:"Moto 18"}
  ];
  const grid=section.querySelector("#vehicleDemoGrid");
  function renderVehicles(filter="all"){
    const list=filter==="all"?vehicles:vehicles.filter(v=>v.type===filter);
    grid.innerHTML=list.map(v=>`<article class="vehicle-demo"><div class="icon">${v.icon}</div><h3>${v.type}</h3><p>${v.line} • السائق: ${v.driver}</p><div class="capacity"><strong>${v.capacity}</strong> أفراد كحد أقصى • ${v.seats} أماكن متاحة</div></article>`).join("");
  }
  section.querySelectorAll("[data-vtype]").forEach(btn=>btn.addEventListener("click",()=>{section.querySelectorAll("[data-vtype]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");renderVehicles(btn.dataset.vtype)}));
  renderVehicles();
}
