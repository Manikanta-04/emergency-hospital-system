<div align="center">

<img src="https://img.shields.io/badge/Emergency%20Hospital-Availability%20System-e53935?style=for-the-badge&logo=hospital&logoColor=white" alt="Banner"/>

# 🚑 Emergency Hospital Availability System

### *AI-Powered Real-Time Hospital Routing & Emergency Dispatch*

<br/>

[![Live Demo](https://img.shields.io/badge/🌐%20Dispatcher%20Dashboard-Visit%20Now-e53935?style=for-the-badge)](https://emergency-hospital-system.vercel.app)
[![Hospital Dashboard](https://img.shields.io/badge/🏥%20Hospital%20Dashboard-Visit%20Now-0070f3?style=for-the-badge)](https://emergency-hospital-system.vercel.app/hospital)
[![Backend API](https://img.shields.io/badge/⚙️%20Backend%20API-Render-10b981?style=for-the-badge)](https://emergency-hospital-system.onrender.com)

<br/>

[![Status](https://img.shields.io/badge/Status-Live-brightgreen?style=flat-square)]()
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/atlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)

</div>

---

## 🚀 Live Demo

| Service | URL |
|---|---|
| 🚑 **Dispatcher Dashboard** | [emergency-hospital-system.vercel.app](https://emergency-hospital-system.vercel.app) |
| 🏥 **Hospital Dashboard** | [emergency-hospital-system.vercel.app/hospital](https://emergency-hospital-system.vercel.app/hospital) |
| ⚙️ **Backend REST API** | [emergency-hospital-system.onrender.com](https://emergency-hospital-system.onrender.com) |
| 💓 **Health Check** | [emergency-hospital-system.onrender.com/health](https://emergency-hospital-system.onrender.com/health) |

> ⚠️ Free-tier Render services may take ~30s to wake up on first request.

---

## 🎥 Demo Video

> 📽️ *(Add a Loom / YouTube demo walkthrough here)*
>
> [![Watch Demo](https://img.shields.io/badge/▶%20Watch%20Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://youtube.com)

---

## 🧠 Problem Statement

When an ambulance rushes to the nearest hospital, it often arrives to find **no ICU beds or specialists available** — wasting critical minutes in life-or-death situations.

Current emergency dispatch systems suffer from:

- 🐢 No real-time visibility into hospital bed or specialist availability
- 🗺️ Routing to the *nearest* hospital — not the *best* one for the emergency type
- 📉 Zero pre-arrival communication — hospital staff aren't prepared when the patient arrives
- 🔇 Silent alerts — no voice announcements for hands-busy hospital staff
- 📊 No analytics — no way to review response times or dispatch history
- ❌ Manual, phone-based coordination that breaks down under pressure

**Every minute of delay in a stroke or cardiac emergency increases irreversible damage.** India's emergency infrastructure needs an intelligent, automated dispatch layer.

---

## 💡 Solution

The **Emergency Hospital Availability System** is an AI-driven dispatch platform that routes ambulances to the *optimal* hospital — factoring in distance, specialist availability, and real-time bed count — and automatically alerts hospital staff via email, voice, and live map tracking before the patient arrives.

> *"Don't route to the nearest hospital. Route to the right hospital."*

---

## 🖼️ Screenshots

| Dispatcher Dashboard | Hospital Map |
|---|---|
| ![Dispatcher](screenshots/dispatcher.png) | ![Map](screenshots/map.png) |

| AI Recommendation Panel | Hospital Alert Dashboard |
|---|---|
| ![AI Score](screenshots/ai-score.png) | ![Hospital Alert](screenshots/hospital-alert.png) |

| Voice Alert System | Analytics Dashboard |
|---|---|
| ![Voice Alert](screenshots/voice-alert.png) | ![Analytics](screenshots/analytics.png) |

> 📌 *(Replace with actual screenshots from your deployed app)*

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                         │
│     React 18 + Vite + Leaflet.js + Axios                  │
│  Dispatcher Dashboard | Hospital Dashboard | Analytics    │
│              Hosted on Vercel CDN                         │
└───────────────────────────┬──────────────────────────────┘
                            │  REST API + Socket.io
                            ▼
┌──────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                        │
│           Node.js + Express.js + Socket.io                │
│  AI Scoring | Alert Dispatch | Live GPS | Analytics API   │
│              Hosted on Render                             │
└──────────┬────────────────────────────┬──────────────────┘
           │  MongoDB Atlas             │  Webhook
           ▼                            ▼
┌──────────────────┐       ┌───────────────────────────────┐
│  MongoDB Atlas   │       │         n8n Cloud              │
│  Hospital Data   │       │  Webhook → Gmail Node          │
│  Alert Logs      │       │  Auto-email to hospital staff  │
│  Analytics Data  │       └───────────────────────────────┘
└──────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│              MAPS, ROUTING & TRACKING LAYER               │
│  Leaflet.js + OpenStreetMap + OSRM + Overpass API         │
│  Real road routing | Live 🚑 GPS via Socket.io            │
│  Separate ambulanceMarkerRef + hospitalMarkerRef          │
└──────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│                  NOTIFICATION LAYER                       │
│  EmailJS (Email) + Web Push API + Web Speech API (Voice)  │
└──────────────────────────────────────────────────────────┘
```

---

## ⚙️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite | UI components & state management |
| **Maps** | Leaflet.js, OpenStreetMap | Interactive map with hospital markers |
| **Routing** | OSRM | Real road routing |
| **Live Tracking** | Socket.io + `navigator.geolocation` | Real-time ambulance GPS on map |
| **Hospital Data** | Overpass API | 1,234+ real hospital locations |
| **HTTP Client** | Axios | API communication |
| **Backend** | Node.js, Express.js | REST API server |
| **Real-time** | Socket.io | Live ambulance location streaming |
| **Database** | MongoDB Atlas | Hospital data, alert logs, analytics |
| **Automation** | n8n Cloud | Webhook → Gmail email alerts |
| **Voice Alerts** | Web Speech API | Browser-native voice announcements |
| **Analytics** | Custom Dashboard | Dispatch history, response times, trends |
| **Frontend Deploy** | Vercel | CDN-hosted React app |
| **Backend Deploy** | Render | Node.js API hosting |

---

## ✨ Features

### 🤖 AI Hospital Scoring Engine
- Ranks hospitals by a **weighted scoring formula** (Distance 35% + Specialist Match 40% + Bed Availability 25%)
- Handles tiebreakers via total bed count
- Example: Apollo (Neurology on duty, 3.2km, 8 ICU beds) → **100/100** beats Rajiv Gandhi (ICU full, 0.6km) → **76/100**

### 🗺️ Real-Time Map & Live Ambulance Tracking
- Interactive Leaflet.js map with live hospital markers
- **Live 🚑 GPS tracking** — ambulance driver's real coordinates streamed every 5 seconds via Socket.io
- Separate `ambulanceMarkerRef` and `hospitalMarkerRef` — smooth `marker.setLatLng()` updates, no flicker
- `ambulanceLocation` state passed from dashboard down to `HospitalMap` prop

### 🔊 Voice Alert System
- Hospital staff receive **spoken voice announcements** on incoming alerts using the Web Speech API
- Hands-free notification — critical for busy OR and ICU environments
- Announces emergency type, ETA, and patient count automatically

### 📊 Analytics Dashboard
- Full dispatch history with timestamps, hospital names, emergency types, and response times
- Visual charts for alert trends, top-dispatched hospitals, and peak hours
- Exportable data for authority reporting and performance review

### 🚨 Automated Hospital Alerting
- Dispatcher clicks "Send Alert & Navigate" — n8n sends **automatic email** to hospital staff
- Hospital dashboard shows live alert with **preparation checklist**
- Retry mechanism for failed webhook deliveries

### 📍 Smart GPS & Fallback
- Auto-detects patient location via browser GPS
- Falls back to **manual city input** if GPS is denied
- Google Maps link sent to hospital staff for patient location

### 🏥 Dual Dashboards
- **Dispatcher view** — select emergency type, view ranked hospitals, dispatch ambulance
- **Hospital view** — receive real-time alerts, view live ambulance on map, hear voice announcement

### 🛡️ Robust Edge Case Handling
- Auto-expands search radius if no hospitals found (10km → 25km → 60km)
- Optimistic bed reservation to handle race conditions (2 ambulances simultaneously)
- Unique `alertLogId` prevents duplicate alert spam
- Offline mode with cached hospital data for zero-internet demos

---

## 🤖 AI Scoring Algorithm

```
Hospital Score = (Distance Score × 0.35)
              + (Specialist Match Score × 0.40)
              + (Bed Availability Score × 0.25)

Tiebreaker → Higher total bed count wins
```

| Factor | Weight | Logic |
|---|---|---|
| 📍 Distance | 35% | Closer hospital = higher score |
| 👨‍⚕️ Specialist Match | 40% | Right doctor on duty = higher score |
| 🛏️ Bed Availability | 25% | More ICU beds available = higher score |

---

## 📊 System Design

```
Dispatcher Request Flow:

[Dispatcher Browser]
     │
     ├── Selects emergency type (Stroke / Heart Attack / Trauma / Burns)
     ├── GPS detects patient location
     ├── POST /api/recommend  →  AI engine scores all nearby hospitals
     ├── Best hospital highlighted on map (blinking red marker)
     └── Click "Send Alert & Navigate"
              │
              ├── POST /api/alert  →  Alert stored in MongoDB
              ├── n8n Webhook triggered  →  Gmail sends email to hospital
              ├── Web Speech API fires  →  Voice alert announced at hospital
              ├── Analytics entry logged  →  Dispatch recorded in dashboard
              └── Socket.io begins streaming ambulance GPS every 5s

[Hospital Dashboard]
     ├── Receives live alert + preparation checklist
     ├── Hears voice announcement (Web Speech API)
     └── Watches live 🚑 move on map via Socket.io

[Analytics Dashboard]
     └── Logs response time, hospital, emergency type, outcome
```

**MongoDB Collections:**

```
hospitals   → { name, location, beds, icuBeds, specializations,
                availableSpecialists, bedsLastUpdated, status }
alertLogs   → { alertLogId, hospitalId, emergencyType, eta,
                patientLocation, webhookStatus, timestamp }
analytics   → { dispatchId, responseTime, hospitalName,
                emergencyType, outcome, timestamp }
```

---

## 🔄 Workflow

```
1. Dispatcher selects emergency type    →  Stroke / Heart Attack / Trauma / Burns
2. GPS auto-detects patient location    →  Fallback: manual city input
3. AI engine scores nearby hospitals    →  Distance + Specialist + Beds weighted formula
4. Best hospital highlighted on map     →  Blinking red marker
5. Dispatcher clicks Send Alert         →  Alert saved to MongoDB + analytics logged
6. n8n webhook fires automatically      →  Gmail notification to hospital staff
7. Voice alert triggers at hospital     →  Web Speech API announces ETA + emergency
8. Ambulance GPS streams live           →  Socket.io pushes coords every 5s to hospital map
9. Hospital map updates smoothly        →  marker.setLatLng() moves 🚑 in real time
10. Hospital dashboard updates          →  Preparation checklist displayed
11. Beds decremented on confirmation    →  Prevents double-booking
```

---

## 📈 Performance & Metrics

| Metric | Value |
|---|---|
| AI scoring response time | < 300ms |
| Real road routing (OSRM) | < 1s |
| Alert dispatch (webhook) | < 2s end-to-end |
| Ambulance GPS update interval | Every 5 seconds (Socket.io) |
| Voice alert trigger delay | < 500ms (Web Speech API) |
| Hospital data coverage | 1,234+ real hospitals (AP + TN) |
| Frontend bundle size | < 2MB (Vite optimized) |
| Edge cases handled | 20 documented scenarios |

---

## 🧪 Testing

```bash
# Backend health check
curl https://emergency-hospital-system.onrender.com/health
# Expected: { "status": "ok" }

# Get all hospitals
curl https://emergency-hospital-system.onrender.com/api/hospitals

# Test AI recommendation
curl -X POST https://emergency-hospital-system.onrender.com/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"emergencyType": "Stroke", "lat": 16.5062, "lng": 80.6480, "patientCount": 1}'

# Send test alert
curl -X POST https://emergency-hospital-system.onrender.com/api/alert \
  -H "Content-Type: application/json" \
  -d '{"hospitalId": "HOSPITAL_ID", "emergencyType": "Stroke", "eta": 8}'

# Get analytics data
curl https://emergency-hospital-system.onrender.com/api/analytics
```

---

## 📁 Project Structure

```
emergency-hospital-system/
│
├── frontend/                              # React Application (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── EmergencyForm.jsx          # Emergency type selector + GPS
│   │   │   ├── HospitalMap.jsx            # Leaflet map + live ambulance tracking
│   │   │   ├── HospitalCard.jsx           # Individual hospital info card
│   │   │   ├── RecommendationPanel.jsx    # AI best-hospital result
│   │   │   ├── RouteNavigator.jsx         # Route display component
│   │   │   ├── AlertStatus.jsx            # Alert confirmation status
│   │   │   ├── VoiceAlert.jsx             # Web Speech API voice announcer
│   │   │   ├── AmbulanceTracker.jsx       # Sends navigator.geolocation every 5s
│   │   │   └── AnalyticsDashboard.jsx     # Dispatch history + charts
│   │   ├── pages/
│   │   │   ├── DispatcherDashboard.jsx    # Main dispatcher view
│   │   │   └── HospitalDashboard.jsx      # Hospital receives alerts + live map
│   │   ├── services/
│   │   │   └── api.js                     # Axios API calls
│   │   └── data/
│   │       └── mockHospitals.js           # Offline fallback data
│   └── vercel.json                        # SPA routing config
│
├── backend/                               # Node.js API Server (Express)
│   ├── routes/
│   │   ├── hospitals.js                   # GET hospital endpoints
│   │   ├── recommend.js                   # POST AI ranking
│   │   ├── alert.js                       # POST alert + webhook
│   │   └── analytics.js                   # GET analytics + dispatch logs
│   ├── controllers/
│   │   ├── hospitalController.js          # Hospital business logic
│   │   ├── recommendController.js         # AI scoring logic
│   │   ├── alertController.js            # Alert dispatch logic
│   │   └── analyticsController.js         # Analytics aggregation
│   ├── models/
│   │   ├── Hospital.js                    # Hospital Mongoose schema
│   │   ├── AlertLog.js                    # Alert log schema
│   │   └── Analytics.js                   # Analytics schema
│   ├── utils/
│   │   └── scoring.js                     # AI scoring algorithm
│   └── data/
│       └── seedRealHospitals.js           # Overpass API hospital seeder
│
└── n8n-workflows/
    └── emergency-alert-workflow.json      # n8n automation export
```

---

## 🔐 Security

- **Environment variables** — no secrets committed to the repository
- **CORS policy** — restricted to known frontend origins only
- **MongoDB Atlas** — IP whitelist + connection string authentication
- **Unique alert IDs** — `alertLogId` prevents duplicate dispatch spam
- **Webhook retry logic** — failed n8n calls are logged and retryable from UI
- **GPS data** — ambulance coordinates transmitted only over secure Socket.io connection

---

## 🔌 API Reference

### Hospitals
```
GET  /api/hospitals                    →  All hospitals
GET  /api/hospitals/nearby             →  Hospitals near coordinates
GET  /api/hospitals/:id                →  Single hospital detail
POST /api/hospitals/:id/heartbeat      →  Update hospital live status
```

### Recommendation
```
POST /api/recommend
Body: { emergencyType, lat, lng, patientCount }
Returns: AI-ranked hospital list with scores
```

### Alerts
```
POST /api/alert
Body: { hospitalId, emergencyType, eta, patientLocation }
Returns: Alert confirmation + webhook status

GET  /api/alert/logs                   →  Recent alert history
POST /api/alert/:id/retry              →  Retry failed webhook
```

### Analytics
```
GET  /api/analytics                    →  Full dispatch history
GET  /api/analytics/summary            →  Response time averages + top hospitals
GET  /api/analytics/trends             →  Alert volume by hour / day
```

---

## 🐛 Bug Fixes & Technical Decisions

| Bug | Root Cause | Fix Applied |
|---|---|---|
| 🚑 Ambulance appearing at hospital instantly | Route animation was placing 🚑 at destination on load | Removed route animation — ambulance now only moves via Socket.io GPS |
| Driver GPS not used | `AmbulanceTracker` wasn't sending real coordinates | Now sends `navigator.geolocation` coordinates every 5s via Socket.io |
| Hospital marker moving with ambulance | Same marker ref used for both ambulance and hospital | Separated into `hospitalMarkerRef` and `ambulanceMarkerRef` |
| Ambulance marker flickering | Marker was recreated on every GPS update | Replaced with `marker.setLatLng()` for smooth position update |
| `ambulanceLocation` ignored by map | Dashboard didn't pass live coords down to `HospitalMap` | Added `ambulanceLocation` state + prop threading to `HospitalMap` |

---

## ⚙️ Local Development Setup

### Prerequisites

- Node.js `v18+`
- MongoDB Atlas account
- n8n Cloud account (free tier available)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Manikanta-04/emergency-hospital-system.git
cd emergency-hospital-system
```

### 2️⃣ Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
MONGO_URI=your_mongodb_atlas_uri
PORT=5000
N8N_WEBHOOK_URL=your_n8n_webhook_url
```

Seed real hospital data:
```bash
npm run seed:real
```

Start the server:
```bash
npm start        # http://localhost:5000
```

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

---

## 🔑 Environment Variables

### Backend — `backend/.env`

```env
MONGO_URI=your_mongodb_atlas_connection_string
PORT=5000
N8N_WEBHOOK_URL=your_n8n_webhook_url
```

---

## 🚀 Deployment

### Frontend → Vercel

| Setting | Value |
|---|---|
| Framework | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### Backend → Render (Web Service)

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |

### Automation → n8n Cloud

- Import `n8n-workflows/emergency-alert-workflow.json` into your n8n instance
- Set the webhook URL as `N8N_WEBHOOK_URL` in your backend `.env`

---

## 🌆 Cities & Data Coverage

| City | Real Hospitals |
|---|---|
| Vijayawada, AP | 383 hospitals |
| Guntur, AP | 186 hospitals |
| Chennai, TN | 665 hospitals |
| **Total** | **1,234+ hospitals** |

*Data sourced from OpenStreetMap via Overpass API*

---

## 🛡️ Edge Cases Handled

| # | Edge Case | Solution |
|---|---|---|
| 1 | Stale bed data | `bedsLastUpdated` timestamp shown to dispatcher |
| 2 | No hospitals found | Auto-expand radius: 10km → 25km → 60km |
| 3 | n8n webhook fails | UI shows retry button + logs failure |
| 4 | GPS denied | Fallback to manual city input |
| 5 | Race condition (2 ambulances) | Optimistic bed reservation on routing |
| 6 | Specialist off-duty | `availableSpecialists[]` vs `specializations[]` |
| 7 | Traffic delays | OSRM real road distance for accurate ETA |
| 8 | Multiple patients | `patientCount` factors into bed requirements |
| 9 | Bed count not updated | Beds decremented immediately on confirmation |
| 10 | Duplicate alerts | Unique `alertLogId` prevents spam |
| 11 | AI score tie | Secondary sort by total bed count |
| 12 | No internet on demo day | Offline mode with cached hospital data |

---

## 🔮 Future Improvements

- [ ] 📱 React Native mobile app for ambulance drivers
- [ ] 📡 Live hospital bed count via hospital management system API
- [ ] 📩 SMS alerts via Twilio for hospital staff without email
- [ ] 🧠 Deep learning ETA prediction based on traffic patterns
- [ ] 🛰️ Satellite-view map layer for disaster zone navigation
- [ ] 🌐 Multi-language support — Telugu, Tamil, Hindi
- [ ] 🏥 Integration with NHA (National Health Authority) hospital registry
- [ ] 📊 Advanced analytics — ML-based response time forecasting

---

## 🤝 Contributing

Contributions are welcome and appreciated!

```bash
# 1. Fork this repository
# 2. Create your feature branch
git checkout -b feature/your-feature-name

# 3. Commit with conventional commits
git commit -m "feat: describe your change"

# 4. Push and open a Pull Request
git push origin feature/your-feature-name
```

Please follow [Conventional Commits](https://www.conventionalcommits.org/) and test your changes before submitting a PR.

---

## 👨‍💻 Author

**Manikanta Naripeddi** — Full Stack Developer

[![GitHub](https://img.shields.io/badge/GitHub-Manikanta--04-181717?style=flat-square&logo=github)](https://github.com/Manikanta-04)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Manikanta%20Naripeddi-0077b5?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/manikanta-naripeddi-4326232a5/)

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙌 Acknowledgements

- [Leaflet.js](https://leafletjs.com/) — Interactive map rendering
- [OpenStreetMap](https://www.openstreetmap.org/) — Map tiles with Telugu + English labels
- [OSRM](http://project-osrm.org/) — Real road routing engine
- [Overpass API](https://overpass-api.de/) — Real hospital location data
- [n8n](https://n8n.io/) — Workflow automation & email dispatch
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — Browser-native voice alerts
- [MongoDB Atlas](https://www.mongodb.com/atlas) — Cloud database
- [Vercel](https://vercel.com/) & [Render](https://render.com/) — Hosting platforms

---

<div align="center">

**Built with ❤️ for smarter emergency response in India**

⭐ **Star this repo** if this project helped or inspired you!

[![GitHub Stars](https://img.shields.io/github/stars/Manikanta-04/emergency-hospital-system?style=social)](https://github.com/Manikanta-04/emergency-hospital-system)

---

*🚑 Route smarter. Respond faster. Save more lives.*

</div>