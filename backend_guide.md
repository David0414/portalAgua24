# Backend & Database Implementation Guide

This project includes a simulated frontend. To make it "100% Real" as requested, follow these steps to deploy the backend on Railway and the Database on Supabase.

## 1. Database (Supabase)

1. Create a new Project in Supabase.
2. Go to the SQL Editor and run the following schema:

```sql
-- Tables
CREATE TABLE machines (
  id TEXT PRIMARY KEY,
  location TEXT NOT NULL,
  last_maintenance TIMESTAMPTZ
);

CREATE TABLE reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  machine_id TEXT REFERENCES machines(id),
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  type TEXT CHECK (type IN ('weekly', 'monthly')),
  checklist_data JSONB NOT NULL,
  admin_comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Data
INSERT INTO machines (id, location) VALUES ('M-001', 'Plaza Central'), ('M-002', 'Av. Reforma');
```

3. Enable Storage in Supabase: Create a public bucket named `evidence`.

## 2. Backend (Node.js/Express on Railway)

1. Create a folder `backend`.
2. `npm init -y` and install: `express cors dotenv @supabase/supabase-js`.
3. Create `server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Routes
app.post('/api/reports', async (req, res) => {
  const { data, error } = await supabase.from('reports').insert(req.body).select();
  if(error) return res.status(500).json(error);
  res.json(data[0]);
});

app.get('/api/reports', async (req, res) => {
  const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
  res.json(data);
});

// ... Implement update endpoints similarly
```

4. Push to GitHub and connect to Railway.
5. Add Variables in Railway: `SUPABASE_URL`, `SUPABASE_KEY`.

## 3. Connecting Frontend

1. In `services/db.ts`, remove the mock code and use `fetch` calls to your Railway URL (e.g., `https://your-app.railway.app/api/reports`).
