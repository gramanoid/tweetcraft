$ErrorActionPreference = "Stop"
node scripts/env-guard-win.js
# Seed login using the existing JS seeder (ensure it uses headful and your persistent profile dir)
npx playwright test e2e/utils/seed-login.spec.mjs -c e2e/live/playwright.config.win.mjs -g "seed login"