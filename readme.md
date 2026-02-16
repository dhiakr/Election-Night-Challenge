# Election Night Results System

Full-stack election night ingestion system with:

- FastAPI backend
- PostgreSQL database
- Next.js frontend
- Docker Compose orchestration

## Run The Project

### Prerequisites

- Docker
- Docker Compose

### Start everything 

```bash
docker compose up --build
```

Frontend container notes:

- Compose uses `frontend/Dockerfile.dev` for development startup.
- `frontend/Dockerfile` remains the production image build file.
- File watcher polling is disabled by default for better performance. If host file-change events are not detected, run with:

```bash
WATCHPACK_POLLING=true docker compose up --build
```

### Optional local frontend workflow

You can run only backend and database in Docker:

```bash
docker compose up --build db backend
```

Then run frontend locally:

```bash
cd frontend
npm ci
npm run dev
```

Services:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API docs (Swagger): `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432` (db: `election`, user: `postgres`, password: `postgres`)

## Upload Results Files

You can upload via:

1. Frontend page: `http://localhost:3000/upload`
2. API directly: `POST /import` with a multipart file field named `file`

Example with `curl`:

```bash
curl -X POST "http://localhost:8000/import" \
  -F "file=@sample-results.txt"
```

### Input format

Each line is one constituency:

```txt
Birmingham\, Central, C, 10000, L, 8000, G, 2000
```

Rules:

- First token is constituency name
- Remaining tokens are party/vote pairs
- Pair order accepts both `code,votes` and `votes,code`
- Escaped commas in constituency names (`\,`) are preserved
- Variable number of party pairs per line is supported

## API Documentation

### `POST /import`

Imports a result file and applies upsert/override logic.

Behavior:

- New constituency -> inserted
- Existing constituency + included parties -> updated
- Existing constituency + omitted parties -> unchanged
- Malformed rows are skipped without failing the whole file
- Import is wrapped in a transaction and guarded by advisory lock for concurrent uploads

Response fields:

- `message`
- `total_lines`
- `processed_lines`
- `skipped_lines`
- `upserted_results`
- `errors[]` (line-level warnings)

### `GET /constituencies`

Returns all constituencies with:

- `name`
- `total_votes`
- `winning_party` (`party_code`, `party_name`, `votes`)
- `parties[]` (`party_code`, `party_name`, `votes`, `percentage`)

### `GET /constituencies/{name}`

Returns a single constituency payload in the same structure as above.

Note: names with commas/spaces must be URL-encoded.

### `GET /totals`

Returns national aggregations:

- `total_votes_per_party[]`
- `total_mps_per_party[]` (1 seat per constituency winner)
- `overall.total_votes`
- `overall.total_constituencies`

## Party Mapping

The backend seeds and enforces this mapping:

- `C` -> Conservative Party
- `L` -> Labour Party
- `UKIP` -> UKIP
- `LD` -> Liberal Democrats
- `G` -> Green Party
- `Ind` -> Independent
- `SNP` -> SNP

## Data Model

### `constituencies`

- `id` (PK)
- `name` (unique)

### `parties`

- `id` (PK)
- `code` (unique)
- `full_name`

### `results`

- `id` (PK)
- `constituency_id` (FK -> constituencies)
- `party_id` (FK -> parties)
- `votes`
- `last_updated`
- unique constraint on (`constituency_id`, `party_id`)

## Design Decisions

- PostgreSQL upsert (`ON CONFLICT DO UPDATE`) enforces idempotent writes
- Partial updates only touch included parties
- Winner tie-break is deterministic (higher votes, then lexical party code)
- File parsing is resilient to malformed lines and escaped commas
- Frontend polls every 15 seconds for near-real-time refresh

## Assumptions

- Input files are UTF-8 encoded
- Negative votes are invalid and ignored
- Unknown party codes are ignored and reported in warnings
- A constituency exists only after at least one valid party/vote pair is parsed

## Edge Cases Handled

- Empty file
- Escaped commas in names
- Duplicate constituency lines in a file
- Multiple uploads of the same file
- Partial updates
- Invalid party codes
- Missing/invalid vote values
- Concurrent uploads
