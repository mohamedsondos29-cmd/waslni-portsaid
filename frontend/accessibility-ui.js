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
});
