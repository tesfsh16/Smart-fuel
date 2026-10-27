export const stations = [
  {
    id: "STA001",
    name: "Bole Station A",
    region: "Addis Ababa",
    address: "Bole Road, Addis Ababa",
    lat: 8.9806, lng: 38.7578,
    distance: "1.2 km",
    inventory: { petrol: 4820, diesel: 8400 },
    thresholds: { petrol: 3000, diesel: 3000 },
    capacity: { petrol: 20000, diesel: 20000 },
    queue: { count: 17, waitMin: 45 },
    reservations: { active: 38 },
    dailySales: 6430,
    deliveries: [
      { type: "Diesel", quantity: 10000, eta: "Tomorrow 09:30", status: "Scheduled" }
    ],
    riskLevel: "HIGH",
    lastUpdated: "2 min ago"
  },
  {
    id: "STA002",
    name: "Kazanchis Station B",
    region: "Addis Ababa",
    address: "Kazanchis, Addis Ababa",
    lat: 9.0105, lng: 38.7614,
    distance: "3.4 km",
    inventory: { petrol: 12600, diesel: 15200 },
    thresholds: { petrol: 3000, diesel: 3000 },
    capacity: { petrol: 20000, diesel: 20000 },
    queue: { count: 4, waitMin: 12 },
    reservations: { active: 11 },
    dailySales: 4210,
    deliveries: [],
    riskLevel: "LOW",
    lastUpdated: "5 min ago"
  },
  {
    id: "STA003",
    name: "Megenagna Station C",
    region: "Addis Ababa",
    address: "Megenagna, Addis Ababa",
    lat: 9.0268, lng: 38.7894,
    distance: "5.1 km",
    inventory: { petrol: 1900, diesel: 2100 },
    thresholds: { petrol: 3000, diesel: 3000 },
    capacity: { petrol: 20000, diesel: 20000 },
    queue: { count: 29, waitMin: 80 },
    reservations: { active: 52 },
    dailySales: 7800,
    deliveries: [
      { type: "Petrol", quantity: 15000, eta: "Today 18:00", status: "In Transit" }
    ],
    riskLevel: "CRITICAL",
    lastUpdated: "8 min ago"
  }
];

export const reservations = [
  { id: "RES001", stationId: "STA001", driver: "Abebe Tadesse", plate: "3-12345 A.A", fuel: "Petrol", amount: 20, queueNo: 47, code: "SF4821", status: "Active", expiry: "10:30" },
  { id: "RES002", stationId: "STA001", driver: "Tigist Haile", plate: "2-98741 A.A", fuel: "Diesel", amount: 30, queueNo: 48, code: "SF4822", status: "Active", expiry: "10:45" },
  { id: "RES003", stationId: "STA002", driver: "Dawit Bekele", plate: "1-55320 A.A", fuel: "Petrol", amount: 15, queueNo: 12, code: "SF3310", status: "Active", expiry: "11:00" },
  { id: "RES004", stationId: "STA001", driver: "Meron Alemu", plate: "4-77811 A.A", fuel: "Diesel", amount: 25, queueNo: 49, code: "SF4823", status: "Completed", expiry: "—" },
];

export const deliveries = [
  { id: "DEL001", from: "National Oil Dist.", to: "STA001", fuel: "Diesel", expected: 10000, received: null, status: "Scheduled", eta: "Tomorrow 09:30", driver: "Kebede Girma" },
  { id: "DEL002", from: "National Oil Dist.", to: "STA003", fuel: "Petrol", expected: 15000, received: null, status: "In Transit", eta: "Today 18:00", driver: "Solomon Tesfaye" },
  { id: "DEL003", from: "National Oil Dist.", to: "STA002", fuel: "Diesel", expected: 20000, received: 18400, status: "Completed", eta: "Yesterday", driver: "Mulugeta Worku" },
];

export const predictions = [
  {
    stationId: "STA001",
    stationName: "Bole Station A",
    fuel: "Diesel",
    riskLevel: "HIGH",
    currentStock: 8400,
    avgDailyUse: 6200,
    nextDelivery: "30 hours",
    hoursToEmpty: 18,
    demandChange: "+40%",
    reasons: [
      "Demand +40% over recent baseline",
      "Current stock: 8,400 L",
      "Average daily consumption: 6,200 L",
      "Next delivery: 30 hours away"
    ],
    recommendation: "Review replenishment or alternative allocation from Station B."
  },
  {
    stationId: "STA003",
    stationName: "Megenagna Station C",
    fuel: "Petrol",
    riskLevel: "CRITICAL",
    currentStock: 1900,
    avgDailyUse: 7800,
    nextDelivery: "6 hours",
    hoursToEmpty: 6,
    demandChange: "+27%",
    reasons: [
      "Stock below critical threshold",
      "Current stock: 1,900 L",
      "Average daily consumption: 7,800 L",
      "Delivery in transit — not yet received"
    ],
    recommendation: "Confirm in-transit delivery arrival. Activate queue restrictions."
  }
];

export const anomalies = [
  {
    id: "ANO001",
    stationId: "STA001",
    stationName: "Bole Station A",
    type: "Unusual Sales Volume",
    typical: "10,000–12,000 L/day",
    observed: "19,000 L",
    severity: "HIGH",
    time: "Today 08:15",
    status: "Under Review"
  },
  {
    id: "ANO002",
    stationId: "STA003",
    stationName: "Megenagna Station C",
    type: "Delivery Discrepancy",
    typical: "Delivery: 20,000 L",
    observed: "Received: 18,400 L  (Δ 1,600 L)",
    severity: "MEDIUM",
    time: "Yesterday 16:40",
    status: "Flagged"
  }
];

export const nationalStats = {
  totalStock: 2400000,
  dailyUsage: 780000,
  risk: "MODERATE",
  stationsOnline: 3,
  stationsTotal: 3,
  alerts: [
    "Demand increase at Bole Station A (+40%)",
    "Megenagna Station C approaching critical stock",
    "Delivery discrepancy at Station B requires review"
  ]
};
