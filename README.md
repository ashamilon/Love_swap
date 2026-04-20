# Love Swap Game

A long-distance, online guessing game for one couple. You and your partner each play from your own device. Take turns answering a question and guessing each other's answers to prove who reads who better.

No Unreal / Unity / other engines. It's a plain React + Vite web app. Realtime sync uses Supabase Realtime Broadcast channels only (no database tables, no schema, no server code).

## Requirements

- Node.js 18+
- npm
- A free Supabase project (used only for realtime messaging, not for storage)

## Setup

1. `npm install`
2. Create a Supabase project at https://supabase.com (free tier is fine).
3. Copy the Project URL and the **publishable** API key (`sb_publishable_...`) from Project Settings -> API.
4. Create `.env.local` in the project root with:

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_your_key_here
   ```

5. `npm run dev` and open the printed URL.

Do not use a secret key (`sb_secret_...`) here. That key is for server-side use only and must never be shipped in browser code.

## How to play (long distance)

1. Player 1 opens the app, picks **Create room**, enters their name, and gets a 5-letter code.
2. Player 1 shares the code with their partner via text / call / etc.
3. Player 2 opens the app, picks **Join room**, enters their name and the code.
4. Once both are connected, Player 1 (the host) sets mode, spice, rounds, then taps **Start game**.
5. Each round: one person answers privately, the other guesses. Screens coordinate automatically - while one types, the other sees a waiting screen.
6. After all rounds, final results show best mind reader and most unexpected answer.

## Scoring

- 80%+ similarity: +2 points
- 50%+ similarity: +1 point
- otherwise: 0
- Random double-points round: 2x multiplier (optional)

Similarity is computed locally using a token-overlap plus Levenshtein heuristic. No AI API calls.

## Deploy

```
npm run build
```

Push the resulting `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3). Remember to set the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars in your host's environment.

## How it works

- `src/lib/supabase.js` - Supabase client setup.
- `src/lib/useRoom.js` - host-authoritative realtime state. The room creator is the host and owns all state transitions. The guest sends actions via broadcast; the host applies them and rebroadcasts the new state to the guest.
- `src/data/questions.js` - handwritten question bank by mode and spice level.
- `src/utils/scoring.js` - local similarity and points.
- `src/utils/reactions.js` - flavor lines.
- `src/App.jsx` - the menu, waiting, lobby, answer, guess, reveal, and final screens.

No tables are created in your Supabase project. Realtime Broadcast uses ephemeral in-memory channels.

## Privacy note

Game messages travel through Supabase Realtime. This is an honor-system party game: both players agree not to peek in devtools during the other's turn. If you want stronger privacy, run it on a private Supabase project you trust.
