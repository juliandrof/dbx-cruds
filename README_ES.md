# DBX CRUDs

> **[English](README_EN.md)** | **Espanol** | **[Portugues](README.md)**

Aplicacion Databricks App para la creacion generica de tablas/formularios con almacenamiento en Lakebase. Ideal para reemplazar hojas de calculo Excel y SharePoint por formularios estructurados con validacion inteligente, importacion de datos e interfaz personalizable.

## Funcionalidades

- **Creacion de Tablas**: Defina columnas, tipos de datos, claves unicas y reglas de validacion. Una tabla Postgres en Lakebase se crea automaticamente
- **Importacion Excel y CSV**: Carga con mapeo visual columna a columna, auto-deteccion de separador CSV, paso de validacion mostrando errores por linea antes de importar
- **Validacion inteligente con IA**: Escriba reglas en lenguaje natural (ej: "debe ser un CPF valido"). El sistema genera codigo Python via LLM y lo ejecuta localmente con 100% de precision
- **Biblioteca de Tools**: Las validaciones generadas por IA se guardan en Lakebase y se reutilizan automaticamente en nuevas tablas
- **Clave Unica**: Las columnas marcadas como unicas impiden valores duplicados (validado en insercion e importacion)
- **Busqueda inteligente**: Busca en todos los campos de cualquier tabla
- **Edicion completa**: Renombrar, agregar/eliminar columnas, cambiar color
- **Eliminacion logica**: Los datos se preservan pero no se muestran
- **Exportacion Excel**: Exporte cualquier tabla a .xlsx
- **Personalizacion visual**: Tema claro/oscuro + 12 colores de destaque
- **Modelo de IA configurable**: Elija entre diversos Foundation Models (Claude, GPT, Llama, Gemini, etc.)
- **Multi-idioma**: Portugues, Ingles y Espanol

## Prerrequisitos

1. **Workspace Databricks** con Lakebase habilitado
2. **Databricks CLI** >= 0.229.0
3. **Node.js** >= 18 (solo para desarrollo local)
4. **Python** >= 3.10

## Deploy paso a paso

### 1. Clone el repositorio

```bash
git clone https://github.com/juliandrof/dbx-cruds.git
cd dbx-cruds
```

### 2. Autentiquese en su workspace

```bash
databricks auth login --host https://SU-WORKSPACE.cloud.databricks.com --profile dbx-cruds
```

### 3. Cree una instancia Lakebase

En la UI de Databricks: **Catalog > Lakebase > Create Database**

Anote:
- **Host** del endpoint (ej: `ep-xxxxx.database.us-west-2.cloud.databricks.com`)
- **Endpoint Name** (ej: `projects/mi-proyecto/branches/production/endpoints/primary`)
- **Nombre de base de datos** (ej: `mi_base`)

### 4. Configure el app.yaml

Edite `app.yaml` con los datos de su Lakebase:

```yaml
env:
  - name: ENDPOINT_NAME
    value: 'projects/SU_PROYECTO/branches/production/endpoints/primary'
  - name: PGHOST
    value: 'SU_HOST_LAKEBASE'
  - name: PGPORT
    value: '5432'
  - name: PGDATABASE
    value: 'SU_BASE_DE_DATOS'
  - name: PGUSER
    value: 'SERVICE_PRINCIPAL_ID_DE_LA_APP'
  - name: PGPASSWORD
    value: 'SU_CONTRASENA_SEGURA'
  - name: PGSSLMODE
    value: 'require'
  - name: SERVING_ENDPOINT
    value: 'databricks-llama-4-maverick'
```

> **IMPORTANTE**: Nunca haga commit de credenciales en git. El `app.yaml` en el repositorio contiene solo placeholders.

### 5. Cree la App en Databricks

```bash
databricks apps create dbx-cruds --description "Creador generico de tablas" --profile dbx-cruds
```

Anote el **Service Principal ID** retornado.

### 6. Configure acceso a Lakebase

Conectese a Lakebase y cree el rol para el Service Principal de la app:

```sql
CREATE ROLE "<SERVICE_PRINCIPAL_ID>" WITH LOGIN PASSWORD '<CONTRASENA_SEGURA>';
GRANT ALL ON DATABASE <SU_BASE_DE_DATOS> TO "<SERVICE_PRINCIPAL_ID>";
GRANT ALL ON SCHEMA public TO "<SERVICE_PRINCIPAL_ID>";
GRANT CREATE ON SCHEMA public TO "<SERVICE_PRINCIPAL_ID>";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "<SERVICE_PRINCIPAL_ID>";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "<SERVICE_PRINCIPAL_ID>";
```

### 7. Suba y despliegue

```bash
# Reemplace SU_EMAIL por su email del workspace
databricks sync . /Users/SU_EMAIL/dbx-cruds \
  --exclude node_modules \
  --exclude .venv \
  --exclude __pycache__ \
  --exclude .git \
  --exclude "frontend/src" \
  --exclude "frontend/public" \
  --exclude app.yaml \
  --profile dbx-cruds

databricks apps deploy dbx-cruds \
  --source-code-path /Workspace/Users/SU_EMAIL/dbx-cruds \
  --profile dbx-cruds
```

### 8. Acceda a la app

```bash
databricks apps get dbx-cruds --profile dbx-cruds
```

La URL sera algo como: `https://dbx-cruds-XXXX.aws.databricksapps.com`

## Arquitectura de validacion

El sistema usa un enfoque de **code-generation** para validaciones:

1. El usuario escribe una regla en lenguaje natural: "debe ser un CPF valido"
2. El LLM genera codigo Python con el algoritmo de validacion
3. El codigo se ejecuta localmente (100% preciso para calculos)
4. El codigo se guarda en Lakebase como "tool" reutilizable
5. La proxima vez que alguien pida "CPF valido", el codigo guardado se reutiliza instantaneamente

```
Primera validacion:       Regla -> LLM genera codigo -> Ejecuta -> Guarda tool (~1-2s)
Validaciones siguientes:  Regla -> Busca tool -> Ejecuta -> Resultado (instantaneo)
```

## API Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/stats` | Estadisticas generales |
| GET | `/api/cruds` | Listar tablas |
| POST | `/api/cruds` | Crear tabla |
| GET | `/api/cruds/:id` | Detalles de la tabla |
| PUT | `/api/cruds/:id` | Actualizar tabla |
| DELETE | `/api/cruds/:id` | Eliminar tabla (logico) |
| POST | `/api/cruds/:id/columns` | Agregar columna |
| PUT | `/api/cruds/:id/columns/:colId` | Actualizar columna |
| DELETE | `/api/cruds/:id/columns/:colId` | Eliminar columna (logico) |
| GET | `/api/cruds/:id/data` | Listar datos (busqueda, paginacion) |
| POST | `/api/cruds/:id/data` | Insertar registro |
| PUT | `/api/cruds/:id/data/:rowId` | Actualizar registro |
| DELETE | `/api/cruds/:id/data/:rowId` | Eliminar registro (logico) |
| POST | `/api/cruds/:id/import/validate` | Validar datos antes de importar |
| POST | `/api/cruds/:id/import` | Importar datos mapeados |
| GET | `/api/cruds/:id/export` | Exportar datos |
| POST | `/api/validate` | Validar valor con regla AI |
| GET | `/api/models` | Listar modelos AI disponibles |
| GET | `/api/tools` | Listar biblioteca de tools de validacion |

## Tipos de datos soportados

| Tipo | Postgres | Descripcion |
|------|----------|-------------|
| text | TEXT | Texto libre |
| integer | BIGINT | Numeros enteros |
| decimal | NUMERIC(18,4) | Numeros decimales |
| boolean | BOOLEAN | Si/No |
| date | DATE | Fecha (YYYY-MM-DD) |
| datetime | TIMESTAMP | Fecha y hora |

## Seguridad

- Las credenciales nunca se commitean en el repositorio (solo placeholders en `app.yaml`)
- Las contrasenas de Lakebase deben configurarse solo en el workspace
- La eliminacion logica preserva los datos (soft delete)
- La validacion de unicidad impide duplicados
- El codigo de validacion AI se ejecuta en sandbox con builtins restringidos

## Logs

Acceda a `https://SU-APP-URL/logz` para ver logs en tiempo real.

## Licencia

MIT
