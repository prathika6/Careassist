# 💙 CareAssist — Age-Adaptive AI Health Companion

A full-stack compassionate health monitoring platform with role-based dashboards, AI companion, medicine reminders, family chat, memory vault, and emergency alert workflows.

---

## 🚀 Quick Start

### 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → Create a free project
2. In your project, go to **SQL Editor**
3. Copy & paste the entire contents of `supabase_schema.sql` and run it
4. Go to **Settings → API** and copy:
   - `Project URL`
   - `anon / public` key

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install & Run

```bash
npm install
npm start
```

App opens at **http://localhost:3000**

---

## 👤 Create Test Users

In Supabase, go to **Authentication → Users → Invite user** (or use the signup page).

After creating accounts via the signup page, use the **Admin dashboard** to:
- Assign a **Doctor** to a **Patient** (`patient_doctors` table)
- Assign a **Caregiver** to a **Patient** (`patient_caregivers` table)
- Link a **Family member** to a **Patient** (`family_members` table)

### Recommended test accounts (create via signup):

| Name | Email | Role | Notes |
|------|-------|------|-------|
| Maya Chen | patient@demo.com | Patient | Age mode: Child |
| Robert Singh | patient2@demo.com | Patient | Age mode: Elder |
| Sarah Johnson | patient3@demo.com | Patient | Age mode: Adult |
| Dr. Priya Nair | doctor@demo.com | Doctor | |
| James Wilson | caregiver@demo.com | Caregiver | |
| Ananya Patel | family@demo.com | Family | |
| Admin User | admin@demo.com | Admin | |

---

## 🏗️ Project Structure

```
careassist/
├── public/
│   └── index.html
├── src/
│   ├── App.js                        # Root router (role-based shells)
│   ├── index.js                      # React entry point
│   ├── styles/
│   │   └── global.css                # All styles, age themes, tokens
│   ├── lib/
│   │   └── supabase.js               # Supabase client
│   ├── context/
│   │   ├── AuthContext.js            # Auth + profile + patient record
│   │   └── ToastContext.js           # Toast notifications
│   └── components/
│       ├── auth/
│       │   └── AuthPage.js           # Login + Signup (role selection)
│       ├── shared/
│       │   ├── Sidebar.js            # Role-aware navigation
│       │   ├── Appointments.js       # Book/view appointments (all roles)
│       │   └── FamilyChat.js         # Real-time family chat
│       ├── patient/
│       │   ├── PatientHome.js        # Dashboard with age-adaptive greeting
│       │   ├── AICompanion.js        # Sunny/Sage/Rose chatbot
│       │   ├── MedicinesPage.js      # Reminders + take/miss logging
│       │   └── MemoryVault.js        # Photo memory gallery
│       ├── caregiver/
│       │   └── CaregiverDashboard.js # Vitals entry + alert system
│       ├── doctor/
│       │   └── DoctorDashboard.js    # Prescriptions + appointments
│       ├── family/
│       │   └── FamilyDashboard.js    # Messages + Hope page
│       └── admin/
│           └── AdminDashboard.js     # User management + assignments
├── supabase_schema.sql               # Full DB schema + RLS + seed data
├── .env.example                      # Environment variable template
└── README.md
```

---

## 🎨 Age Modes

| Mode | Theme | Tone | Key Features |
|------|-------|------|-------------|
| **Child** 🌟 | Warm orange/yellow, playful | "Hey little star!" | Mood stickers, reward badges, cartoon companion Sunny |
| **Adult** 🌿 | Teal/green, clean | "Recovery is a journey" | Goals, stress check-ins, companion Sage |
| **Elder** 🌸 | Warm amber, large text | "You are not alone" | Large buttons, memory vault, companion Rose |

---

## 🔒 Role-Based Access

| Role | Can Do |
|------|--------|
| **Patient** | View own data, chat, mood log, memories, medicines |
| **Caregiver** | Log vitals, mark medicines, see medical alerts |
| **Doctor** | Write prescriptions, manage appointments, view health history |
| **Family** | Send messages, chat, view appointments, add memories |
| **Admin** | Manage users, assign relationships, view system stats |

---

## 🚨 Alert System

| Level | Trigger | Patient Sees | Notified |
|-------|---------|-------------|---------|
| 1 — Care Reminder | Mild abnormality (e.g. temp 38°C) | Gentle encouragement | Caregiver |
| 2 — Attention Needed | Moderate (e.g. O₂ < 94%) | Calm reassurance | Caregiver + Doctor |
| 3 — Emergency | Critical (e.g. O₂ < 90%) | "Your care team is here" | Caregiver + Doctor + Emergency Contact |

---

## 🗄️ Database Tables

`user_profiles` · `patients` · `patient_caregivers` · `patient_doctors` · `family_members` · `emergency_contacts` · `health_records` · `alerts` · `prescriptions` · `medicine_reminders` · `medicine_logs` · `appointments` · `consultation_notes` · `doctor_reports` · `family_messages` · `family_chat_messages` · `voice_notes` · `memory_vault` · `mood_logs` · `hope_messages` · `ai_companion_chats` · `notifications`

---

## 🤖 AI Companion

The AI companion (`AICompanion.js`) uses keyword-matching responses stored in the component. To upgrade to Gemini or OpenAI:

```js
// In AICompanion.js, replace getAIResponse() with:
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'x-api-key': process.env.REACT_APP_ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: `You are ${persona.name}, a compassionate health companion for a ${mode} patient. Be warm, encouraging, avoid medical jargon.`,
    messages: [{ role: 'user', content: userMessage }]
  })
});
```

---

## 📦 Deploy

### Vercel (recommended)
```bash
npm install -g vercel
vercel --prod
# Set env vars in Vercel dashboard
```

### Netlify
```bash
npm run build
# Drag the build/ folder to netlify.com
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router v6
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Styling**: Custom CSS variables (no Tailwind required)
- **Icons**: Lucide React
- **Dates**: date-fns

---

Built with 💙 — CareAssist v1.0
