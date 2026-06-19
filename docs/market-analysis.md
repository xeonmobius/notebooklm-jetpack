# NotebookLM Extension Market Analysis

**Date:** 2026-06-19
**Scope:** Competitive landscape of NotebookLM browser extensions on Chrome Web Store and Firefox AMO, to identify feature opportunities for NotebookLM Jetpack.

---

## The landscape

| Extension | Users | Pricing | Strength | Chrome | Firefox |
|---|---|---|---|:---:|:---:|
| **NotebookLM Tools** | 80k+ | Free + Pro | Organization powerhouse (35+ tools) | ✓ | ✓ |
| **Kortex** | 80k+ | $3.75/mo · $99 lifetime · $12/seat | Premium "second brain" + automation | ✓ | ✗ |
| **ExtendLM** | — | Free | Import depth (paywall, playlists) | ✓ | ✗ |
| **NotebookLM Web Importer** | — | Free | Clean basic import | ✓ | ✓ |
| **NotebookLM Source Uploader** | — | Free | Minimal link collector | ✓ | ✗ |
| **YouTube to NotebookLM** | — | Free | YouTube-only | ✓ | ✓ |
| **NotebookLM Jetpack** | — | Free / OSS | Doc-site crawl + podcasts + bilingual | ✓ | ✓ |

### Competitor profiles

**NotebookLM Tools** (nlmtools.com — the benchmark)
- Source folders (drag/drop, color-code, 50/notebook), tags, nested org
- Cross-notebook search (tabbed results, source-type filters, text highlighting)
- Studio items inline viewer + generation (flashcards, quizzes, mind maps, slides, video) with custom format/length/language
- Saved prompts with `/slash` commands (up to 100)
- Bulk import (URLs, YouTube playlists, RSS, ZIP, all open tabs, Drive refresh)
- Notebook dashboard (grid/table, sort, permission badges)
- Podcast command center (scan all notebooks for Audio Overviews, persistent player, playlists, MP3/ZIP download, skip-listened)
- Multi-account, backup/restore (JSON/ZIP), duplicate scanner (title/URL + content similarity)
- Pro tier: distraction-free, early access, multi-generation

**Kortex** (kortex-notebooklm.com — the premium lane)
- "Unified brain" — save chats/sources/insights into searchable second brain
- Active workbench: highlight, annotate, edit, remix sources
- Nested folders + tags, global cross-project context
- Automation pipelines (8 triggers × 11 actions × 9 pre-built rules)
- Cloud sync (cross-device), podcast feed system (stream notebooks as audio)
- Social imports (X, Reddit, YouTube), Google Docs sync, bulk generation
- Source Views (save/restore NotebookLM states)
- Teams ($12/seat): shared prompts, team notebooks, admin. Enterprise: SSO, zero-retention.
- Pricing: Free (limited) / Pro $3.75-mo / Lifetime $99 / Teams / Enterprise

**ExtendLM** (extendlm.com — import-focused)
- One-click import (web pages, YouTube, tabs, links), **including paywalled content**
- Bulk link import, YouTube playlists + channels
- Folders, Google Drive sync, audio recording, PDF export

**NotebookLM Web Importer** — basic web/YouTube/RSS/tabs/bulk-links import. Clean UX, shallow feature set.

**NotebookLM Source Uploader** — minimal: collect links, send to NotebookLM.

**YouTube to NotebookLM** — YouTube-only import + summaries.

---

## Where Jetpack already wins (defend these)

1. **Framework-aware doc-site crawling** — 14+ frameworks (Docusaurus, MkDocs, VitePress, GitBook, ReadTheDocs, Sphinx, Mintlify, DevSite, Anthropic, Yuque, WeChat, HarmonyOS, Huawei, etc.) via llms.txt / sitemap / catalog API / DOM. **No competitor does this.** They import one page at a time; Jetpack ingests whole doc sites.
2. **Podcast ingestion** — Apple Podcasts + 小宇宙 FM. Unique. Others only touch NotebookLM's *own* Audio Overviews.
3. **Bilingual (en/zh)** + 小宇宙 = China-market moat nobody else has.
4. **Now cross-browser** (Chrome + Firefox MV2) — only Jetpack, NotebookLM Tools, and Web Importer run on Firefox.

---

## Feature gaps — what competitors do that Jetpack doesn't

### Tier 1 — High leverage, builds on existing infrastructure
- **Audio Overview command center** — scan all notebooks for Audio Overviews; persistent player; playlists; download MP3/ZIP; "skip listened." *(NotebookLM Tools, Kortex)*. Jetpack already has the podcast plumbing (`services/podcast.ts`, downloads).
- **Cross-notebook search** — one search bar across all notebooks/sources; tabbed results; filters. *(NotebookLM Tools)*.
- **Saved prompts + `/slash` commands** — prompt library. *(NotebookLM Tools, Kortex)*.

### Tier 2 — Table stakes (every serious competitor has these)
- **Source folders/tags** — nested folders, drag/drop, color tags. *(all three majors)*
- **Bulk notebook management** — grid/table view, sort, bulk delete/move, permission badges. *(NotebookLM Tools, Kortex)*
- **Duplicate source scanner** — title/URL + content similarity. *(NotebookLM Tools)*

### Tier 3 — Differentiation / premium territory
- **Studio generation from sidebar** — generate quiz/flashcards/slides/report without leaving the extension; "generate all in one click." *(NotebookLM Tools)*
- **Highlight & annotate sources** — active workbench, not read-only. *(Kortex)*
- **Automation pipelines** — triggers × actions (e.g. "bookmark → import → summarize"). *(Kortex Pro)*
- **Google Drive sync** — 1-click sources ↔ Docs. *(Kortex, ExtendLM)*
- **Social imports** — X/Reddit threads. *(Kortex)*
- **Paywall content import**. *(ExtendLM)*
- **Multi-account switcher**. *(NotebookLM Tools)*
- **Backup/restore** settings + tags + prompts as JSON/ZIP. *(NotebookLM Tools)*

---

## Ponytail-filtered build order (top 3)

1. **Audio Overview command center** — reuses `services/podcast.ts` + downloads infra (80% of the code exists). Biggest "wow," smallest net-new code.
2. **Cross-notebook search** — high demand, moderate effort. DOM-scraping patterns from doc analysis transfer.
3. **Saved prompts + slash commands** — tiny (one storage schema + one content-script hook), sticky daily-use feature.

**Skip for now:** automation pipelines, cloud sync, team features — that's Kortex's paid lane. Jetpack is OSS/free; lean into **depth** (doc-site crawl, podcasts, bilingual, cross-browser), not breadth.

---

## Strategic notes

Proven paid market exists (Kortex: $3.75/mo → $99 lifetime → $12/seat; NotebookLM Tools Pro). Two open lanes nobody owns:
- **Developer/researcher doc-ingestion tool** — unmatched doc-site crawl could be a paid "Pro crawl" tier (subdomain crawl, version pinning, full-site PDF, API docs → notebook).
- **China/bilingual market** — 小宇宙 + zh UI, no competitor touches this.

Jetpack's moat: **doc-site depth + podcasts + bilingual + cross-browser**. Defend depth, don't chase Kortex's roadmap.

---

## Sources

- nlmtools.com (NotebookLM Tools features)
- kortex-notebooklm.com (Kortex features + pricing)
- extendlm.com (ExtendLM features)
- chromewebstore.google.com (NotebookLM Web Importer, Source Uploader, YouTube to NotebookLM)
- addons.mozilla.org (Firefox listings)
- funblocks.net/aitools/reviews/notebooklm-tools-chrome-extension
- xda-developers.com, medium.com coverage
