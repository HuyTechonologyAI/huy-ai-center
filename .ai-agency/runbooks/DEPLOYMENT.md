# RUNBOOK: PRODUCTION DEPLOYMENT
1. Pre-build local safety check & test suite.
2. Compile and sign binaries locally (Android APK versionCode 24).
3. Push to canonical branch `main`.
4. Vercel automatically deploys edge runtime.
5. Run live endpoint smoke test (/api/version).
