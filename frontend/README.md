<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1d8da016-b25f-4081-877b-103399cea03e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Firebase Collections (auto-created)

When Firebase is configured, these collections are created automatically on first write:

- `users/{uid}`
   - Basic profile data (`uid`, `email`, `displayName`, timestamps)
- `users/{uid}/ayahAttempts/{autoId}`
   - Per-ayah NLP attempts (`surahNo`, `surahNameAr`, `ayahNo`, `recognizedText`, `mistakes`, `isLastAyah`)
- `users/{uid}/surahCompletions/{surahNo}`
   - Surah completion summary (`totalMistakes`, `completedWithLessThan10Mistakes`)

Required Firebase env vars in [.env.local](.env.local):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Run with Docker

From the project root (one level above this folder):

1. Ensure [frontend/.env.local](.env.local) exists and contains `GEMINI_API_KEY`
2. Start the app with Docker Compose:
   `docker compose up --build`
3. Open: `http://localhost:3000`

To stop:
`docker compose down`
