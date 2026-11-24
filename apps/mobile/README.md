# HAWLHAYE Mobile (Expo / React Native)

Native client for the HAWL task-management API (github.com/ZakiOmer22/HawlHaye). It talks to the existing API unchanged.

## Run
```
npm install
cp .env.example .env     # set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_WEB_ORIGIN
npx expo start           # then press a / i, or scan with Expo Go
npm run typecheck
```
`EXPO_PUBLIC_WEB_ORIGIN` must equal the API's `WEB_ORIGIN` env var exactly (the API's CSRF check compares the Origin header).
App lock (biometrics) and SecureStore need a real device or a dev build; Expo Go works for most screens.

## What's included
Screens rebuilt 1:1 from the web app (same tokens, Plus Jakarta Sans, EN/SO/AR translations copied from the web, dark/light theme): Login (+inline 2FA), forgot/reset password, accept invite, change password, app shell (header, drawer, floating dock, notifications bell, account menu), Board (board/list/calendar, filters, create, assign, reason modals), My Tasks, Delegations, Review, Task detail. Dashboard, Profile, Security, Support, Users, Audit work but are still the earlier design (next batch).
forced password change, biometric app lock, Board (6 status columns), My Tasks, Inbox (delegations + Dean/Deputy review queue),
Dashboard (reports roles), Task detail (workflow actions, assign, delegate, comments, activity, attachments via signed URLs, upload),
Create task, Search, Security (change password, 2FA setup/disable, sessions), live updates over SSE (foreground) with polling fallback.

## How auth works against the current API
The API uses an httpOnly session cookie + CSRF double-submit + Origin check. The app relies on the OS cookie jar for the session,
stores the CSRF token (returned in the login body) in SecureStore, and sets `Origin` explicitly. **Not yet tested on a physical device**:
verify login, a mutation (e.g. transition) and SSE on iOS and Android. If cookies don't stick, use the bearer-token patch in the review.

## Not included
Push notifications (API has none), passkeys, offices/categories/settings admin, impersonation, help center. (Support tickets, Users admin and Audit log ARE included.)
