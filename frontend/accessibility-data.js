const accessibleVehicles = [
  { id: "W-101", type: "باص منخفض الأرضية", capacity: 34, wheelchair: 2, seats: 10, ramp: true, lift: true, audio: true, visual: true, priority: true, charging: true, status: "متاح", line: "خط 2", eta: 4 },
  { id: "W-104", type: "ميني باص Accessible", capacity: 22, wheelchair: 1, seats: 8, ramp: true, lift: false, audio: true, visual: true, priority: true, charging: false, status: "في الطريق", line: "خط 4", eta: 7 },
  { id: "W-107", type: "باص مجهز بالكامل", capacity: 40, wheelchair: 3, seats: 12, ramp: true, lift: true, audio: true, visual: true, priority: true, charging: true, status: "متاح", line: "خط 7", eta: 9 },
  { id: "W-109", type: "باص وصول سهل", capacity: 36, wheelchair: 2, seats: 11, ramp: true, lift: true, audio: false, visual: true, priority: true, charging: true, status: "قريب", line: "خط 9", eta: 5 },
  { id: "W-112", type: "ميني باص منخفض الأرضية", capacity: 18, wheelchair: 1, seats: 6, ramp: true, lift: false, audio: true, visual: true, priority: true, charging: false, status: "متاح", line: "خط 2", eta: 12 },
  { id: "W-115", type: "باص عائلي Accessible", capacity: 45, wheelchair: 3, seats: 14, ramp: true, lift: true, audio: true, visual: true, priority: true, charging: true, status: "في الطريق", line: "خط 4", eta: 15 }
];

const accessibilityServices = [
  { icon: "♿", title: "منحدر كرسي متحرك", text: "Ramp ثابت وآمن للصعود والنزول." },
  { icon: "🛗", title: "مصعد هيدروليكي", text: "رفع آمن للكراسي في المركبات المجهزة." },
  { icon: "🔊", title: "إعلانات صوتية", text: "إعلان المحطات القادمة والتنبيهات صوتيًا." },
  { icon: "👁️", title: "شاشة مرئية", text: "معلومات الخط والمحطات بخط واضح." },
  { icon: "🪑", title: "مقاعد أولوية", text: "مقاعد مخصصة لكبار السن وذوي الاحتياجات." },
  { icon: "🔋", title: "USB Charging", text: "شحن الأجهزة أثناء الرحلة في المركبات المجهزة." },
  { icon: "🆘", title: "زر مساعدة", text: "طلب مساعدة السائق بسهولة داخل المركبة." },
  { icon: "📍", title: "محطات Accessible", text: "إظهار المحطات التي تحتوي على وصول مناسب." }
];
