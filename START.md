# Running WorldWideView locally with Docker Compose

Turnkey local bring-up of the full stack: **Next.js app + Postgres + data-engine + Redis + 14 live seeders**, on a 3D globe.

## Prerequisites
- Docker Engine + Compose v2 (`docker compose version`). Compose v2.20+ recommended.
- ~4 GB free RAM, a few GB disk. Outbound internet (pulls images, npm deps, and live data feeds).
- No API keys required to get a working, data-populated globe.

## Two commands
```bash
./setup-local.sh                              # one-time: writes .env, stages seeders, mkdir mounts
docker compose --profile engine up --build    # builds + starts the full stack
```
That's it. Then open **http://localhost:3000**.

> ⚠️ The live data (engine + redis) is behind the **`engine` compose profile**. A plain
> `docker compose up` (without `--profile engine`) starts only the app + DB → an **empty globe**.
> Always use `--profile engine` for a working stack.

## What comes up
| Service | Port | Role |
|---|---|---|
| `wwv` | `3000` | Next.js app (UI + API + MCP) |
| `db` | `5432` | Postgres 15 (Prisma migrates on boot) |
| `wwv-data-engine` | `5000` | streams live seeder data over `ws://localhost:5000/stream` |
| `wwv-redis` | (internal) | live snapshot cache + command queue |

## Verify it's working
```bash
curl -s localhost:3000/api/health        # app health
curl -s localhost:5000/health            # engine + per-seeder last-run
curl -s localhost:5000/manifest          # should list 14 seeders (earthquakes, satellite, wildfires, ...)
```
In the browser: the globe renders immediately; live layers (earthquakes, satellites, aircraft, wildfires,
markets, etc.) populate within ~1 minute as each seeder's first fetch lands. Toggle layers in the UI.

## What you get with NO API keys
- **Base imagery:** renders fine — keyless Google XYZ satellite tiles, falling back to Cesium Ion's
  default token, then OpenStreetMap. You can also pick OSM / ArcGIS / Blue Marble in the layer switcher.
- **Live data:** all **keyless** seeders work out of the box — earthquakes (USGS), wildfires (NASA FIRMS),
  sanctions (OFAC), civil-unrest (GDELT), satellites + surveillance-satellites (CelesTrak/SGP4),
  military-aviation (ADSB.lol), market-tracker (Yahoo), iranwarlive, nz-traffic-cameras, plus the two
  mock layers (conflict-events, gps-jamming).
- **Won't appear** until you add keys: Google **Photorealistic 3D Tiles** (needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`),
  the **cyber-attacks** seeder (`OTX_API_KEY`), and the **maritime/AIS** seeder (`AISSTREAM_API_KEY`).
  Add any of these to `.env` (engine keys) and re-run; the build args for `NEXT_PUBLIC_*` require `--build`.

## Optional keys (`.env`)
| Var | Unlocks |
|---|---|
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | reliable base imagery / world terrain (avoids relying on Cesium's default token) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Photorealistic 3D Tiles (the photo-mesh globe) |
| `OTX_API_KEY` | the `cyber-attacks` live layer (AlienVault OTX) |
| `AISSTREAM_API_KEY` | the `maritime` (ship AIS) live layer |

## Troubleshooting
- **`network coolify declared as external, but could not be found`** (older compose only): run
  `docker network create coolify` once, then retry. (`setup-local.sh` already does this when Docker is on PATH;
  modern compose strips the unused network automatically.)
- **Globe is empty:** make sure you used `--profile engine`, and that `local-seeders/community/` has the
  14 seeder folders (re-run `./setup-local.sh`). Check `curl localhost:5000/manifest` is non-empty.
- **Port already in use (3000/5000/5432):** stop the conflicting service or remap host ports in
  `docker-compose.yml` (`WWV_DB_PORT`, `WWV_ENGINE_HOST_PORT` are env-overridable).
- **Rebuild after changing a `NEXT_PUBLIC_*` value:** those are baked at build time —
  `docker compose --profile engine up --build` (not just restart).
- **Reset everything:** `docker compose --profile engine down -v` (drops the DB + redis + engine SQLite volumes).

## Notes
- Edition is `local` (single-user, no Supabase/Stripe). `demo`/`cloud` editions need extra config.
- The engine runs with `WWV_SKIP_WS_AUTH=true` (compose default) so the browser streams without auth tickets.
- Seeders are the **prebuilt published bundles** (`seeders.zip`), staged under `local-seeders/community/`;
  the engine's start command runs `pnpm install` + native rebuild there before serving.
