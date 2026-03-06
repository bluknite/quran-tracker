# Quran Progress Tracker

A beautiful, responsive React web application that allows users to read the Holy Quran online and seamlessly track their reading progress down to the exact Surah and Ayah.

Built with modern web technologies, this tracker saves your position in the cloud, allowing you to pick up exactly where you left off from any device.

## Features

- **📖 Authentic Reading Experience**: High-quality, seamlessly cropped scans of the original Madani script pages.
- **☁️ Cloud Sync**: Log in securely with Google via Supabase to save your exact reading progress permanently.
- **📍 Precise Tracking**: Uses a verified `Page <-> Verse` JSON mapping algorithm to track exactly which Surah, Ayah, and Juz you are currently reading.
- **📊 Reading History Dashboard**: Visualizes your last 14 days of reading activity on an interactive Recharts histogram.
- **🔮 Dynamic Forecaster**: Calculates your rolling reading pace and predicts exactly what date you will finish your current Khatm cycle.
- **🌟 Juz Milestones**: Celebrates completed Juzs by rendering stacked amber bubbles floating above your daily reading bars.
- **📱 Mobile Optimized**: Includes native left/right swipe touch gestures to turn pages on phones and tablets.
- **🌙 True Dark Mode**: Automatically adapts to your system preferences with a custom creamy paper background that perfectly blends the page images.
- **⚡ Lightning Fast**: The 604 page images were processed via a Node.js Sharp script to algorithmically crop out all asymmetric scanner gutters and text, dropping the repository's image size footprint by over 950 MB!

## Tech Stack

- **Frontend Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4 (with custom scrollbars and dark mode)
- **Database & Authentication**: Supabase (PostgreSQL + Google OAuth)
- **Deployment**: GitHub Pages via GitHub Actions (CI/CD)
- **Data Preprocessing**: Node.js + Sharp (for intelligent margin cropping/optimization)

## Local Development Initialization

To run this project locally, you will need Node.js and npm installed, as well as a Supabase project.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/bluknite/quran-tracker.git
   cd quran-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

## Database Schema

The user's progress is securely stored in a Supabase PostgreSQL mapping utilizing Row Level Security (RLS) policies guaranteeing privacy and isolation.

```sql
CREATE TABLE khatms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  khatm_number int NOT NULL,
  user_label text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  last_read_at timestamp with time zone,
  completed_at timestamp with time zone,
  surah_number int DEFAULT 1,
  ayah_number int DEFAULT 1
);

CREATE TABLE reading_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  khatm_id uuid REFERENCES khatms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users NOT NULL,
  page_number int NOT NULL,
  read_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE khatms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own khatms" ON khatms FOR ALL USING (auth.uid() = user_id);

ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own reading history" ON reading_history FOR ALL USING (auth.uid() = user_id);
```
