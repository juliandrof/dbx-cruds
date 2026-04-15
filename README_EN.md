# DBX CRUDs

> **English** | **[Espanol](README_ES.md)** | **[Portugues](README.md)**

Databricks App for generic table/form creation with Lakebase storage. Replace Excel spreadsheets and SharePoint with structured forms featuring smart validation, data import, and a customizable UI.

## Features

- **Table Creation**: Define columns, data types, unique keys, and validation rules. A Postgres table in Lakebase is created automatically
- **Excel & CSV Import**: Upload with visual column mapping, auto-detect CSV separator, validation step showing per-row errors before importing
- **AI-Powered Validation**: Write rules in natural language (e.g., "must be a valid CPF"). The system generates Python code via LLM and executes locally with 100% accuracy
- **Tool Library**: AI-generated validations are saved in Lakebase and automatically reused across new tables
- **Unique Keys**: Columns marked as unique prevent duplicate values (validated on insert and import)
- **Smart Search**: Search across all fields of any table
- **Full Editing**: Rename, add/remove columns, change color
- **Soft Delete**: Data is preserved but hidden
- **Excel Export**: Export any table to .xlsx
- **Visual Customization**: Light/dark theme + 12 accent colors
- **Configurable AI Model**: Choose from multiple Foundation Models (Claude, GPT, Llama, Gemini, etc.)
- **Multi-language**: Portuguese, English, and Spanish

## Prerequisites

1. **Databricks Workspace** with Lakebase enabled
2. **Databricks CLI** >= 0.229.0
3. **Node.js** >= 18 (local development only)
4. **Python** >= 3.10

## Step-by-step Deploy

### 1. Clone the repository

```bash
git clone https://github.com/juliandrof/dbx-cruds.git
cd dbx-cruds
```

### 2. Authenticate with your workspace

```bash
databricks auth login --host https://YOUR-WORKSPACE.cloud.databricks.com --profile dbx-cruds
```

### 3. Create a Lakebase instance

In the Databricks UI: **Catalog > Lakebase > Create Database**

Note down:
- **Endpoint host** (e.g., `ep-xxxxx.database.us-west-2.cloud.databricks.com`)
- **Endpoint Name** (e.g., `projects/my-project/branches/production/endpoints/primary`)
- **Database name** (e.g., `my_database`)

### 4. Configure app.yaml

Edit `app.yaml` with your Lakebase details:

```yaml
env:
  - name: ENDPOINT_NAME
    value: 'projects/YOUR_PROJECT/branches/production/endpoints/primary'
  - name: PGHOST
    value: 'YOUR_LAKEBASE_HOST'
  - name: PGPORT
    value: '5432'
  - name: PGDATABASE
    value: 'YOUR_DATABASE'
  - name: PGUSER
    value: 'APP_SERVICE_PRINCIPAL_ID'
  - name: PGPASSWORD
    value: 'YOUR_SECURE_PASSWORD'
  - name: PGSSLMODE
    value: 'require'
  - name: SERVING_ENDPOINT
    value: 'databricks-llama-4-maverick'
```

> **IMPORTANT**: Never commit credentials to git. The `app.yaml` in this repository contains only placeholders.

### 5. Create the App in Databricks

```bash
databricks apps create dbx-cruds --description "Generic table creator" --profile dbx-cruds
```

Note the returned **Service Principal ID**.

### 6. Configure Lakebase access

Connect to Lakebase and create the role for the app's Service Principal:

```sql
CREATE ROLE "<SERVICE_PRINCIPAL_ID>" WITH LOGIN PASSWORD '<SECURE_PASSWORD>';
GRANT ALL ON DATABASE <YOUR_DATABASE> TO "<SERVICE_PRINCIPAL_ID>";
GRANT ALL ON SCHEMA public TO "<SERVICE_PRINCIPAL_ID>";
GRANT CREATE ON SCHEMA public TO "<SERVICE_PRINCIPAL_ID>";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "<SERVICE_PRINCIPAL_ID>";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "<SERVICE_PRINCIPAL_ID>";
```

### 7. Upload and deploy

```bash
# Replace YOUR_EMAIL with your workspace email
databricks sync . /Users/YOUR_EMAIL/dbx-cruds \
  --exclude node_modules \
  --exclude .venv \
  --exclude __pycache__ \
  --exclude .git \
  --exclude "frontend/src" \
  --exclude "frontend/public" \
  --exclude app.yaml \
  --profile dbx-cruds

databricks apps deploy dbx-cruds \
  --source-code-path /Workspace/Users/YOUR_EMAIL/dbx-cruds \
  --profile dbx-cruds
```

### 8. Access the app

```bash
databricks apps get dbx-cruds --profile dbx-cruds
```

The URL will be something like: `https://dbx-cruds-XXXX.aws.databricksapps.com`

## Validation Architecture

The system uses a **code-generation** approach for validations:

1. User writes a rule in natural language: "must be a valid CPF"
2. LLM generates Python code with the validation algorithm
3. Code is executed locally (100% accurate for calculations)
4. Code is saved in Lakebase as a reusable "tool"
5. Next time someone requests "valid CPF", the saved code is reused instantly

```
First validation:      Rule -> LLM generates code -> Execute -> Save tool (~1-2s)
Subsequent validations: Rule -> Find tool -> Execute -> Result (instant)
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/stats` | General statistics |
| GET | `/api/cruds` | List tables |
| POST | `/api/cruds` | Create table |
| GET | `/api/cruds/:id` | Table details |
| PUT | `/api/cruds/:id` | Update table |
| DELETE | `/api/cruds/:id` | Delete table (soft) |
| POST | `/api/cruds/:id/columns` | Add column |
| PUT | `/api/cruds/:id/columns/:colId` | Update column |
| DELETE | `/api/cruds/:id/columns/:colId` | Remove column (soft) |
| GET | `/api/cruds/:id/data` | List data (search, pagination) |
| POST | `/api/cruds/:id/data` | Insert record |
| PUT | `/api/cruds/:id/data/:rowId` | Update record |
| DELETE | `/api/cruds/:id/data/:rowId` | Delete record (soft) |
| POST | `/api/cruds/:id/import/validate` | Validate data before importing |
| POST | `/api/cruds/:id/import` | Import mapped data |
| GET | `/api/cruds/:id/export` | Export data |
| POST | `/api/validate` | Validate value with AI rule |
| GET | `/api/models` | List available AI models |
| GET | `/api/tools` | List validation tool library |

## Supported Data Types

| Type | Postgres | Description |
|------|----------|-------------|
| text | TEXT | Free text |
| integer | BIGINT | Whole numbers |
| decimal | NUMERIC(18,4) | Decimal numbers |
| boolean | BOOLEAN | Yes/No |
| date | DATE | Date (YYYY-MM-DD) |
| datetime | TIMESTAMP | Date and time |

## Security

- Credentials are never committed to the repository (only placeholders in `app.yaml`)
- Lakebase passwords should only be configured in the workspace
- Soft delete preserves data
- Unique key validation prevents duplicates
- AI validation code runs in a sandbox with restricted builtins

## Logs

Access `https://YOUR-APP-URL/logz` for real-time logs.

## License

MIT
