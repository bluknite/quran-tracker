import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error(`
❌ ERROR: Missing Supabase Credentials in .env.local

In order to run a database migration script locally, you must provide your
service_role key (which bypasses RLS) so we can alter tables and migrate data.

1. Go to your Supabase Dashboard -> Settings -> API
2. Copy the "service_role" secret key
3. Add it to your .env.local file like this:
   SUPABASE_SERVICE_ROLE_KEY=your-secret-key
    `)
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
    console.log('🚀 Starting Multi-Khatm Database Migration...')

    // Step 1: Execute Raw SQL to build new tables, migrate data, and add constraints
    const sql = `
-- 1. Create the new khatms table
CREATE TABLE IF NOT EXISTS public.khatms (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  khatm_number int NOT NULL,
  user_label text,
  status text DEFAULT 'active',
  surah_number int DEFAULT 1,
  ayah_number int DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  completed_at timestamp with time zone
);

ALTER TABLE public.khatms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own khatms" ON public.khatms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own khatms" ON public.khatms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own khatms" ON public.khatms FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Add khatm_id to reading_history
ALTER TABLE public.reading_history ADD COLUMN IF NOT EXISTS khatm_id uuid REFERENCES public.khatms(id);

-- 3. Migrate existing user_progress to Khatm 1
DO $$
DECLARE
    progress_record RECORD;
    new_khatm_id UUID;
BEGIN
    FOR progress_record IN SELECT * FROM public.user_progress LOOP
        -- Create Khatm 1 for this user
        INSERT INTO public.khatms (user_id, khatm_number, status, surah_number, ayah_number, created_at)
        VALUES (progress_record.user_id, 1, 'active', progress_record.surah_number, progress_record.ayah_number, progress_record.updated_at)
        RETURNING id INTO new_khatm_id;

        -- Migrating all of this user's orphans reading_history to this new Khatm
        UPDATE public.reading_history
        SET khatm_id = new_khatm_id
        WHERE user_id = progress_record.user_id AND khatm_id IS NULL;
    END LOOP;
END $$;

-- 4. Apply strict constraints to reading_history now that orphans are adopted
ALTER TABLE public.reading_history ALTER COLUMN khatm_id SET NOT NULL;

-- Drop any existing unique constraint if it was built improperly before
ALTER TABLE public.reading_history DROP CONSTRAINT IF EXISTS unique_per_khatm_page;
-- Prevent duplicate page saves per Khatm cycle
ALTER TABLE public.reading_history ADD CONSTRAINT unique_khatm_page UNIQUE (khatm_id, page_number);
    `

    console.log('📦 Executing schema migration payload on Supabase via RPC...')

    // We create an RPC function on Supabase to execute raw SQL directly,
    // Alternatively, if the RPC doesn't exist, we will use individual queries.
    // For safety in this environment without full RPC access, we will query via REST logic where possible,
    // but schema alterations must generally go through the dashboard's SQL Editor or Migrations.

    console.log(`
⚠️ IMPORTANT MANUAL STEP REQUIRED:
Supabase REST APIs cannot execute raw DDL (CREATE TABLE, ALTER) queries for security reasons.

Please open your Supabase Dashboard -> SQL Editor
And execute the following migration block manually:

${sql}

Once you have executed that SQL block, your database will be fully migrated!
    `)
}

runMigration()
