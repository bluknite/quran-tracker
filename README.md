# Quran Progress Tracker

A beautiful, responsive React web application that allows users to read the Holy Quran online and seamlessly track their reading progress down to the exact Surah and Ayah.

Built with modern web technologies, this tracker saves your position in the cloud, allowing you to pick up exactly where you left off from any device.

## Features

- **📖 Authentic Reading Experience**: High-quality, seamlessly cropped scans of the original Madani script pages.
- **☁️ Cloud Sync**: Log in securely with Google via Supabase to save your exact reading progress permanently.
- **📍 Precise Tracking**: Uses a verified `Page <-> Verse` JSON mapping algorithm to tell you exactly which Surah and Verse you are currently looking at on any given page.
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

The user's progress is securely stored in a Supabase PostgreSQL table with Row Level Security (RLS) policies guaranteeing privacy.

```sql
CREATE TABLE user_progress (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  surah_number int,
  ayah_number int,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```
