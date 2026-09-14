# Task Log

React + Vite task tree with local storage and optional private Supabase sync.

## Development
```sh
npm ci
npm run dev
npm run build
```

## Cloud setup
Project: `juodnoiwehmlqzhhhukp` (task-log).
In Supabase Authentication → URL Configuration, set Site URL to:
https://7purpleice.github.io/task-log/
Add the same URL to Redirect URLs. For local auth testing also allow your localhost URL and adjust the redirect in src/cloud.js.

Email/password authentication must be enabled. Confirm your email, then sign in on both devices.
Supabase's default email service restricts recipients to project team addresses; configure custom SMTP for other addresses.

Use “Перенести локальные задачи в облако” once on the device holding your existing tasks while the cloud journal is empty.
Local data is preserved under task-log:v1. Imports replace the cloud journal after confirmation.
The public client key in src/cloud.js is not an admin credential. Never add a service-role or secret key to the frontend.

## Behavior
Cloud reads poll every 5 seconds while visible, and on focus/reconnection.
Writes require internet and are confirmed by the server before showing success. No offline write queue.
The server uses revision compare-and-swap: stale writes fail rather than overwriting another device.
Editor drafts are preserved during remote edits; reload the current task explicitly to discard a conflicting draft.
Account switching remounts the workspace to prevent mixing data between users.

## Validation
Checked database ownership isolation, anonymous access denial, direct-write denial, and stale-revision rejection in a rolled-back transaction.
Exercised cloud hook add/update/delete, remote refresh, document validation, and stale-editor rejection with mocked requests.
Production build runs in the existing GitHub Pages workflow. Two-device browser sign-in requires the email configuration above.
