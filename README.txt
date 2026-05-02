Electricity Bill Dashboard
==========================

Files:
- index.html
- style.css
- script.js

Setup:
1. Enable Google Sheets API in Google Cloud.
2. Create an API key.
3. Restrict the key to Google Sheets API and your website domain/referrer when publishing.
4. Either paste the API key at the top of script.js in CONFIG.googleApiKey, or paste it in the website setup box.
5. Open index.html.

This version uses the official Google Sheets API metadata endpoint, so it reads real visible sheet tabs, excludes hidden sheets and pre-SEP-2025 sheets, and automatically includes newly added month sheets during refresh/auto-refresh.
