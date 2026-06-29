# Mimir Landing

Private Astro static landing package for the Mimir product surface.

The visible product title stays `Mimir`. The technical core remains `Mimir Core` in developer-facing
metadata only.

```bash
pnpm --filter @jcode.labs/mimir-landing dev
pnpm --filter @jcode.labs/mimir-landing build
```

No PostHog or hosted document telemetry belongs here. If analytics are needed later, prefer
Cloudflare Web Analytics.
