# InfluencerAI

AI matchmaking between Indian brands and the creators their customers trust. A brand describes its campaign in plain words (Hinglish welcome), and InfluencerAI returns a ranked, explainable shortlist of creators. The shortlist covers 12 Indian languages and every city tier, and it is costed and planned in rupees.

> **Demo build.** Every creator profile, statistic and brand collaboration in this app is fictional, generated deterministically in code. There is no database. A brand's brief and shortlist stay in its own browser (`localStorage`). Early-access and creator waitlist sign-ups go through Netlify Forms.

## What it does

| Area | What you get |
| --- | --- |
| **Brief understanding** | Paste a campaign brief and Claude turns it into structured targeting through the `/api/parse-brief` Netlify Function, using structured outputs. If no API key is configured, a built-in rules parser handles English, Hindi and Hinglish phrasing such as "₹5 lakh", "tier 2/3", "Hindi belt" and "Gen Z". |
| **Explainable matching** | Each creator gets a 0–100 score built from 8 weighted components: niche, audience, language, geography, engagement, authenticity, budget and platform. The app shows the reason for each score, the risks, and the hard filters that excluded a creator. |
| **Discover** | Browse every creator by niche, language, platform, size tier, city tier, region, engagement and authenticity. Filters live in the URL so a view can be shared. |
| **Creator profiles** | Audience demographics, an authenticity and brand-safety review, an indicative rate card, past (fictional) collaborations, fit against your current brief, and an outreach draft in English or Hinglish with an ASCI disclosure reminder. |
| **Shortlist and planner** | Budget totals, CPM and CPE, a one-click "optimise within budget" plan, and CSV export. |

## Tech stack

- **React 19 + TypeScript 7 + Vite 8**, with routing by React Router 8 and styling by Tailwind CSS v4
- **Netlify Functions** (TypeScript) host the Claude-powered brief parser (`@anthropic-ai/sdk`)
- **Vitest** for unit tests of the dataset, matching engine, optimiser, brief parsers, function handler and utilities

## Getting started

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # typecheck + production build into dist/
```

Under `npm run dev` there is no function runtime, so brief parsing uses the built-in rules parser automatically. To exercise the Claude parser locally, run the site through the Netlify CLI (`npx netlify-cli dev`) with `ANTHROPIC_API_KEY` set.

### Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | No | Enables Claude brief parsing in `/api/parse-brief`. Without it the function returns `503 ai_unavailable` and the app falls back to the rules parser. |

Set it in **Netlify → Site configuration → Environment variables**, or in a local `.env` file for `netlify dev` (see `.env.example`).

## Project structure

```
index.html                     SPA shell + static Netlify Forms definitions (deploy-time form detection)
netlify.toml                   build, SPA routing, security headers
netlify/functions/             parse-brief.mts → POST /api/parse-brief
netlify/lib/                   server-side handler for the function (tested in isolation)
src/
  App.tsx, main.tsx            routes and providers
  types.ts                     domain model shared by UI, engine, parsers and the function
  config/                      product name, navigation, Netlify Forms helpers
  data/
    taxonomy.ts                niches, 12 languages, platforms, regions, states, ~75 cities by tier, creator tiers
    creators.ts (+generator/)  deterministic fictional creator dataset
    sampleBriefs.ts            ready-made Indian campaign briefs
  lib/
    matching/                  scoring engine and budget optimiser
    brief/                     rules parser, AI output schema, API client, defaults
    format.ts                  ₹ lakh/crore and K/M formatting
    outreach.ts, csv.ts        outreach drafts and CSV export
  state/                       brief and shortlist contexts (persisted to localStorage)
  components/                  UI kit, layout, and feature components
  pages/                       one lazily loaded page per route
```

## How matching works

The [How it works](/methodology) page in the app documents this in full. In short:

1. A brief can leave a criterion unspecified (an empty list or a zero budget). That component is skipped, and the remaining weights are re-normalised, so creators are never penalised for something the brand didn't ask for.
2. Hard filters exclude a creator outright, and the app always states the reason. The filters are: no target platform; authenticity below the brief's minimum; engagement below the minimum; wrong size tier; work with a named competitor in the last 6 months; or no platform that supports the deliverable.
3. Cost, reach and engagement estimates come from the creator's best platform for the deliverable. The optimiser then picks creators by score-weighted reach per rupee, without exceeding the budget and while keeping reach spread across cities.

## AI brief parsing

`netlify/functions/parse-brief.mts` calls Claude (`claude-opus-5-5`, low effort) with a JSON-schema structured output that mirrors the brief model. The function validates the output with zod and maps city names to the app's city IDs. The request opts into Anthropic's server-side refusal fallbacks (`fallbacks: "default"`), so a declined request is retried on a fallback model instead of failing. Any failure, including a missing key, a timeout or invalid output, makes the client fall back to the rules parser, and the user is told which parser read the brief.

## Deployment (Netlify)

Live at **https://influencerai-india.netlify.app**. The Netlify site is linked to this repository: every push or merge to `main` triggers a production deploy automatically.

`netlify.toml` defines the whole setup: build with `npm run build`, publish `dist/`, functions in `netlify/functions/`, SPA fallback routing and security headers. Two settings live in the Netlify dashboard:

- **Forms**: enable form detection (Site configuration → Forms) so the brand early-access and creator waitlist forms collect submissions.
- **Environment**: add `ANTHROPIC_API_KEY` to turn on Claude brief parsing.

## Roadmap

- Real creator data from official platform APIs (Instagram Graph API, YouTube Data API), with each creator's consent and in line with India's DPDP Act 2023
- Accounts, saved campaigns and team sharing, which will need a database
- Outreach tracking, contracts, GST-compliant invoicing and payouts
- Post-campaign measurement against the reach and engagement estimates

## License

Apache-2.0. See [LICENSE](LICENSE).
