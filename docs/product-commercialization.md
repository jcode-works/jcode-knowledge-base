# Product Commercialization

## Pricing Hypothesis

Initial paid product: **Mimir Desktop** for developers, consultants, and small teams handling
confidential dossiers.

| Plan | Price to test | Notes |
| --- | --- | --- |
| Solo perpetual | EUR 390 one-time | Includes updates for the current major line plus 2 years of updates. |
| Solo subscription | EUR 29/month | Optional alternative for users who prefer OpEx. |
| Launch offer | 40% off | Early-adopter validation only; do not bake into permanent pricing. |

The go/no-go threshold remains at least 5 paid pre-sales or purchases before heavy native packaging,
signing, and licensing work.

## Payment Provider Decision

Default provider: **Lemon Squeezy**.

Rationale:

- It is already used in the broader JCode/WorkoutGen operating context.
- It supports hosted checkout URLs, so the static landing can stay simple.
- It can generate license keys for software variants.
- It acts as merchant of record for taxes and payment operations.

Keep Paddle as the fallback if Lemon Squeezy cannot support the final EU VAT, licensing, or payout
requirements. Avoid Stripe as the first choice unless JCode wants to own more tax/compliance work.

## Distribution Model

Distribute Mimir Desktop through direct downloads and sideloadable installers, not through App Store
or Play Store listings. This keeps the product aligned with local-first confidential workflows and
avoids store account, review, and revenue-share coupling.

Initial channels:

- macOS, Windows, and Linux direct downloads from the Mimir website or GitHub releases.
- Android APK-style sideloading when mobile packaging is ready.
- iOS deferred until a compliant non-store channel is selected; do not assume broad direct iOS
  installation in product copy or release planning.

## License Model

Use a perpetual per-major license:

- A purchased major version keeps working indefinitely.
- Updates are included for a time-boxed window, initially 2 years.
- New major versions can require a paid upgrade.
- Subscriptions, if offered, map to license validity through the provider lifecycle.

The app should validate licenses locally where possible and degrade gracefully when offline. Online
activation/checks must be explicit, scoped, and limited to license metadata.

The app now has a local signed-license path:

- License keys use `MIMIR1.<payload>.<signature>`.
- Payloads target `mimir-desktop`, carry holder, tier, major version, issue date, update window, and
  optional runtime expiration.
- Validation happens locally with an ECDSA P-256 public JWK provided at build time through
  `VITE_MIMIR_LICENSE_PUBLIC_KEY_JWK`.
- Private signing keys stay outside the repository and are supplied only to
  `pnpm --filter @jcode.labs/mimir-app license:issue`.

## Deferred Implementation

- Create Lemon Squeezy product and variants.
- Wire hosted checkout links into the landing.
- Define webhook handling for purchases, renewals, refunds, and license events.
- Connect provider-issued license events to the local license format.
