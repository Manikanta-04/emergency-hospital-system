# 🚑 Emergency Hospital Availability System

<div align="center">

![Emergency Hospital System](https://img.shields.io/badge/Status-Live-brightgreen?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**AI-Powered Real-Time Hospital Routing & Emergency Dispatch System**

[🌐 Live Demo](https://emergency-hospital-system.vercel.app) • [🏥 Hospital Dashboard](https://emergency-hospital-system.vercel.app/hospital) • [⚙️ API](https://emergency-hospital-system.onrender.com)

</div>

---

## 📌 The Problem

When an ambulance rushes to the nearest hospital, it often arrives to find **no ICU beds or specialists available** — wasting critical minutes in life-or-death situations.

## ✅ The Solution

An intelligent dispatch system that:
- **Routes ambulances** to the best hospital — not just the nearest one
- **Alerts hospitals in advance** so staff can prepare before the patient arrives
- Uses **AI scoring** to rank hospitals by distance, specialist availability, and bed count
- Shows **real-time routing** with animated ambulance navigation

---

## 🔴 Live URLs

| Service | URL |
|---|---|
| 🚑 Dispatcher Dashboard | https://emergency-hospital-system.vercel.app |
| 🏥 Hospital Dashboard | https://emergency-hospital-system.vercel.app/hospital |
| ⚙️ Backend API | https://emergency-hospital-system.onrender.com |
| 💓 Health Check | https://emergency-hospital-system.onrender.com/health |

---

## 🎥 Demo Flow

```
1. Dispatcher selects emergency type (Stroke / Heart Attack / Trauma / Accident / Burns)
         ↓
2. GPS detects patient location automatically
         ↓
3. AI engine scores all nearby hospitals (Distance + Specialist + Beds)
         ↓
4. Best hospital highlighted on map with blinking red marker
         ↓
5. Dispatcher clicks "Send Alert & Navigate"
         ↓
6. n8n sends automatic email to hospital staff
         ↓
7. OSRM draws real road route with animated 🚑 ambulance
         ↓
8. Hospital dashboard shows live alert with preparation checklist
```

---

## 🤖 AI Scoring Algorithm

The system ranks hospitals using a weighted scoring formula:

| Factor | Weight | Description |
|---|---|---|
| 📍 Distance | 35% | Closer hospital = higher score |
| 👨‍⚕️ Specialist Match | 40% | Right doctor on duty = higher score |
| 🛏️ Bed Availability | 25% | More ICU beds available = higher score |

**Tiebreaker:** If two hospitals have the same score, the one with more total beds wins.

**Example:** For a Stroke patient:
- Apollo (Neurology on duty, 3.2km, 8 ICU beds) → Score: **100/100** ✅
- Rajiv Gandhi (ICU Full, 0.6km) → Score: **76/100** ❌ despite being closer

---

## 🗺️ Maps Technology

| Technology | Role | Cost |
|---|---|---|
| **Leaflet.js** | Interactive map display | Free |
| **OpenStreetMap** | Map tiles with Telugu + English labels | Free |
| **OSRM** | Real road routing + ambulance animation | Free |
| **Overpass API** | Fetched 1234+ real hospital locations | Free |
| **Google Maps Link** | Patient location for hospital staff | Free |

---

## 🏗️ Tech Stack

### Frontend
```
React 18          → UI components and state management
Vite              → Fast development server and build tool
Leaflet.js        → Interactive map with hospital markers
Axios             → HTTP requests to backend API
```

### Backend
```
Node.js           → Server runtime
Express.js        → REST API framework
Mongoose          → MongoDB ODM
dotenv            → Environment variable management
CORS              → Cross-origin resource sharing
```

### Database & Cloud
```
MongoDB Atlas     → Cloud database for hospital data and alert logs
Overpass API      → Source of real hospital location data
```

### Automation
```
n8n Cloud         → Workflow automation
Webhook           → Receives alert from backend
Gmail Node        → Sends email notification to hospital staff
```

### Deployment
```
Vercel            → Frontend hosting (auto-deploy from GitHub)
Render            → Backend hosting (auto-deploy from GitHub)
MongoDB Atlas     → Database (always-on cloud)
n8n Cloud         → Automation (always-on cloud)
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- n8n Cloud account (free)

### 1. Clone the repository
```bash
git clone https://github.com/Manikanta-04/emergency-hospital-system.git
cd emergency-hospital-system
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Create `.env` file:
```env
MONGO_URI=your_mongodb_atlas_uri
PORT=5000
N8N_WEBHOOK_URL=your_n8n_webhook_url
```

Seed real hospital data:
```bash
npm run seed:real
```

Start server:
```bash
npm start
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`

---

## 📁 Project Structure

```
emergency-hospital-system/
├── frontend/                          # React Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── EmergencyForm.jsx      # Emergency type selector + GPS
│   │   │   ├── HospitalMap.jsx        # Interactive Leaflet map
│   │   │   ├── HospitalCard.jsx       # Individual hospital info card
│   │   │   ├── RecommendationPanel.jsx # AI best-hospital result
│   │   │   ├── RouteNavigator.jsx     # Route display component
│   │   │   └── AlertStatus.jsx        # Alert confirmation status
│   │   ├── pages/
│   │   │   ├── DispatcherDashboard.jsx # Main dispatcher view
│   │   │   └── HospitalDashboard.jsx  # Hospital receives alerts
│   │   ├── services/
│   │   │   └── api.js                 # Axios API calls
│   │   └── data/
│   │       └── mockHospitals.js       # Offline fallback data
│   └── vercel.json                    # Vercel SPA routing config
│
├── backend/                           # Node.js API Server
│   ├── routes/
│   │   ├── hospitals.js               # GET hospital endpoints
│   │   ├── recommend.js               # POST AI ranking
│   │   └── alert.js                   # POST alert + webhook
│   ├── controllers/
│   │   ├── hospitalController.js      # Hospital business logic
│   │   ├── recommendController.js     # AI scoring logic
│   │   └── alertController.js        # Alert dispatch logic
│   ├── models/
│   │   ├── Hospital.js                # Hospital schema
│   │   └── AlertLog.js                # Alert log schema
│   ├── utils/
│   │   └── scoring.js                 # AI scoring algorithm
│   └── data/
│       └── seedRealHospitals.js       # Overpass API hospital seeder
│
└── n8n-workflows/
    └── emergency-alert-workflow.json  # n8n automation export
```

---

## 🔌 API Reference

### Hospitals
```
GET  /api/hospitals              → All hospitals
GET  /api/hospitals/nearby       → Hospitals near coordinates
GET  /api/hospitals/:id          → Single hospital
POST /api/hospitals/:id/heartbeat → Update hospital status
```

### Recommendation
```
POST /api/recommend
Body: { emergencyType, lat, lng, patientCount }
Returns: Ranked hospital list with AI scores
```

### Alerts
```
POST /api/alert
Body: { hospitalId, emergencyType, eta, patientLocation }
Returns: Alert confirmation + webhook status

GET  /api/alert/logs             → Recent alert history
POST /api/alert/:id/retry        → Retry failed webhook
```

---

## 🛡️ Edge Cases Handled

| # | Edge Case | Solution |
|---|---|---|
| 1 | Stale bed data | `bedsLastUpdated` timestamp shown to dispatcher |
| 2 | No hospitals found | Auto-expand search radius (10km → 25km → 60km) |
| 3 | n8n webhook fails | UI shows retry button + logs failure |
| 4 | GPS denied | Fallback to manual city input |
| 5 | Race condition (2 ambulances) | Optimistic bed reservation on routing |
| 6 | Specialist off-duty | `availableSpecialists[]` separate from `specializations[]` |
| 7 | Traffic delays | OSRM real road distance for accurate ETA |
| 8 | No SMS/email backup | n8n sends both email + dashboard notification |
| 10 | Multiple patients | `patientCount` field factors into bed requirements |
| 14 | Bed count not updated | Beds decremented immediately on confirmed routing |
| 18 | Duplicate alerts | Unique `alertLogId` prevents spam |
| 19 | Tie in AI score | Secondary sort by total bed count |
| 20 | No internet on demo day | Offline mode with cached hospital data |

---

## 🌆 Cities Covered

| City | Hospitals |
|---|---|
| Vijayawada, AP | 383 real hospitals |
| Guntur, AP | 186 real hospitals |
| Chennai, TN | 665 real hospitals |

*Data sourced from OpenStreetMap via Overpass API*

---

## 👨‍💻 Developer

<div align="center">

**Manikanta Naripeddi**

[![GitHub](https://img.shields.io/badge/GitHub-Manikanta--04-181717?style=for-the-badge&logo=github)](https://github.com/Manikanta-04)

</div>

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

Built with ❤️ for smarter emergency response  

[![Live Demo](https://img.shields.io/badge/Live-Demo-green?style=for-the-badge)](https://emergency-hospital-system.vercel.app)  
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/manikanta-naripeddi-4326232a5/)

</div>