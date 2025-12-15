# Supabase Setup for Global Leaderboard

Follow these steps to set up a global leaderboard for Dan's Dungeon Crawler.

## 1. Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" and sign up (free)
3. Create a new project (give it any name, e.g., "dungeon-crawler")
4. Wait for the project to be created (~2 minutes)

## 2. Create the Leaderboard Table

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Paste this SQL and click **Run**:

```sql
-- Create the leaderboard table
CREATE TABLE leaderboard (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  wins INTEGER DEFAULT 0,
  floors_traversed INTEGER DEFAULT 0,
  mode_wins JSONB DEFAULT '{"brutal": 0, "hard": 0, "normal": 0, "easy": 0, "casual": 0, "custom": 0}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_leaderboard_wins ON leaderboard(wins DESC);
CREATE INDEX idx_leaderboard_username ON leaderboard(username);

-- Enable Row Level Security (RLS)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the leaderboard
CREATE POLICY "Anyone can read leaderboard" ON leaderboard
  FOR SELECT USING (true);

-- Allow anyone to insert/update their own scores
CREATE POLICY "Anyone can insert scores" ON leaderboard
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update scores" ON leaderboard
  FOR UPDATE USING (true);
```

## 3. Get Your API Keys

1. Go to **Settings** > **API** (in left sidebar)
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## 4. Update the Game Code

Open `main.js` and find these lines near the top:

```javascript
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Replace them with your actual values:

```javascript
const SUPABASE_URL = "https://your-project-id.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-key";
```

## 5. Deploy

Commit and push your changes:

```bash
git add main.js
git commit -m "Add Supabase leaderboard configuration"
git push
```

## Done! 🎉

Your leaderboard is now global! All players will share the same leaderboard and can see each other's scores.

---

## Troubleshooting

### "Local Mode" still showing?
- Make sure you replaced BOTH the URL and the anon key
- Check for typos in the values
- Make sure you saved the file and deployed

### Scores not saving?
- Check browser console (F12) for errors
- Make sure the SQL table was created successfully
- Verify RLS policies were applied

### Want to reset the leaderboard?
Run this SQL in Supabase SQL Editor:
```sql
TRUNCATE TABLE leaderboard;
```

---

## Security Note

The anon key is safe to expose in frontend code - it only allows the operations permitted by your Row Level Security policies. The leaderboard is public by design.

