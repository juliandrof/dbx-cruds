# DBX CRUDs

Databricks App para criacao generica de tabelas/formularios com armazenamento no Lakebase. Ideal para substituir planilhas Excel e SharePoint por formularios estruturados com validacao inteligente, importacao de dados e visual personalizavel.

## Funcionalidades

- **Criacao de Tabelas**: Defina nome, colunas, tipos de dados, chaves unicas e regras de validacao. Uma tabela Postgres no Lakebase e criada automaticamente
- **Importacao Excel e CSV**: Upload com mapeamento visual coluna-a-coluna, auto-deteccao de separador CSV, step de validacao mostrando erros por linha antes de importar
- **Validacao inteligente por IA**: Escreva regras em linguagem natural (ex: "deve ser um CPF valido"). O sistema gera codigo Python via LLM e executa localmente com 100% de precisao
- **Biblioteca de Tools**: Validacoes geradas pela IA sao salvas no Lakebase e reutilizadas automaticamente em novas tabelas
- **Chave Unica**: Colunas marcadas como unicas impedem valores duplicados (validado no insert e na importacao)
- **Busca inteligente**: Pesquisa em todos os campos de qualquer tabela
- **Edicao completa**: Renomear, adicionar/remover colunas, alterar cor
- **Exclusao logica**: Dados sao preservados mas nao exibidos
- **Exportacao Excel**: Exporte os dados de qualquer tabela para .xlsx
- **Personalizacao visual**: Tema claro/escuro + 12 cores de destaque
- **Modelo de IA configuravel**: Escolha entre diversos Foundation Models (Claude, GPT, Llama, Gemini, etc.)

## Pre-requisitos

1. **Workspace Databricks** com Lakebase habilitado
2. **Databricks CLI** >= 0.229.0
3. **Node.js** >= 18 (apenas para desenvolvimento local)
4. **Python** >= 3.10

## Deploy passo a passo

### 1. Clone o repositorio

```bash
git clone https://github.com/juliandrof/dbx-cruds.git
cd dbx-cruds
```

### 2. Autentique no seu workspace

```bash
databricks auth login --host https://SEU-WORKSPACE.cloud.databricks.com --profile dbx-cruds
```

### 3. Crie uma instancia Lakebase

No Databricks UI: **Catalog > Lakebase > Create Database**

Anote:
- **Host** do endpoint (ex: `ep-xxxxx.database.us-west-2.cloud.databricks.com`)
- **Endpoint Name** (ex: `projects/meu-projeto/branches/production/endpoints/primary`)
- **Database name** (ex: `meu_banco`)

### 4. Configure o app.yaml

Edite `app.yaml` com os dados do seu Lakebase:

```yaml
env:
  - name: ENDPOINT_NAME
    value: 'projects/SEU_PROJETO/branches/production/endpoints/primary'
  - name: PGHOST
    value: 'SEU_HOST_LAKEBASE'
  - name: PGPORT
    value: '5432'
  - name: PGDATABASE
    value: 'SEU_DATABASE'
  - name: PGUSER
    value: 'SERVICE_PRINCIPAL_ID_DO_APP'
  - name: PGPASSWORD
    value: 'SUA_SENHA_SEGURA'
  - name: PGSSLMODE
    value: 'require'
  - name: SERVING_ENDPOINT
    value: 'databricks-llama-4-maverick'
```

> **IMPORTANTE**: Nunca commite credenciais no git. O `app.yaml` no repositorio contem apenas placeholders.

### 5. Crie o App no Databricks

```bash
databricks apps create dbx-cruds --description "Criador generico de tabelas" --profile dbx-cruds
```

Anote o **Service Principal ID** retornado.

### 6. Configure acesso ao Lakebase

Conecte ao Lakebase e crie o role para o Service Principal do app:

```sql
CREATE ROLE "<SERVICE_PRINCIPAL_ID>" WITH LOGIN PASSWORD '<SENHA_SEGURA>';
GRANT ALL ON DATABASE <SEU_DATABASE> TO "<SERVICE_PRINCIPAL_ID>";
GRANT ALL ON SCHEMA public TO "<SERVICE_PRINCIPAL_ID>";
GRANT CREATE ON SCHEMA public TO "<SERVICE_PRINCIPAL_ID>";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "<SERVICE_PRINCIPAL_ID>";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "<SERVICE_PRINCIPAL_ID>";
```

### 7. Faca upload e deploy

```bash
# Substitua SEU_EMAIL pelo seu email
databricks sync . /Users/SEU_EMAIL/dbx-cruds \
  --exclude node_modules \
  --exclude .venv \
  --exclude __pycache__ \
  --exclude .git \
  --exclude "frontend/src" \
  --exclude "frontend/public" \
  --profile dbx-cruds

databricks apps deploy dbx-cruds \
  --source-code-path /Workspace/Users/SEU_EMAIL/dbx-cruds \
  --profile dbx-cruds
```

### 8. Acesse o app

```bash
databricks apps get dbx-cruds --profile dbx-cruds
```

A URL sera algo como: `https://dbx-cruds-XXXX.aws.databricksapps.com`

## Estrutura do projeto

```
dbx-cruds/
├── app.yaml                # Config do Databricks App (credenciais via env vars)
├── app.py                  # Entry point FastAPI
├── requirements.txt        # Dependencias Python
├── server/
│   ├── config.py           # Auth dual-mode (local/remote)
│   ├── db.py               # Conexao Lakebase + DDL dinamico
│   ├── models.py           # Modelos Pydantic
│   ├── llm.py              # Cliente Foundation Model API
│   ├── validators.py       # Engine de validacao por code-generation
│   └── routes/
│       ├── cruds.py        # CRUD management API
│       ├── data.py         # Data operations API
│       ├── imports.py      # Import/Export + validacao de importacao
│       └── ai.py           # Validacao AI + biblioteca de tools
├── frontend/
│   └── dist/
│       └── index.html      # Frontend standalone (React via CDN)
└── README.md
```

## Arquitetura de validacao

O sistema usa uma abordagem de **code-generation** para validacoes:

1. Usuario escreve regra em linguagem natural: "deve ser um CPF valido"
2. LLM gera codigo Python com o algoritmo de validacao
3. Codigo e executado localmente (100% preciso para calculos)
4. Codigo e salvo no Lakebase como "tool" reutilizavel
5. Na proxima vez que alguem pedir "CPF valido", o codigo salvo e reutilizado instantaneamente

```
Primeira validacao:  Regra → LLM gera codigo → Executa → Salva tool (~1-2s)
Proximas validacoes: Regra → Busca tool → Executa → Resultado (instantaneo)
```

## API Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/stats` | Estatisticas gerais |
| GET | `/api/cruds` | Listar tabelas |
| POST | `/api/cruds` | Criar tabela |
| GET | `/api/cruds/:id` | Detalhes da tabela |
| PUT | `/api/cruds/:id` | Atualizar tabela |
| DELETE | `/api/cruds/:id` | Excluir tabela (logico) |
| POST | `/api/cruds/:id/columns` | Adicionar coluna |
| PUT | `/api/cruds/:id/columns/:colId` | Atualizar coluna |
| DELETE | `/api/cruds/:id/columns/:colId` | Remover coluna (logico) |
| GET | `/api/cruds/:id/data` | Listar dados (busca, paginacao) |
| POST | `/api/cruds/:id/data` | Inserir registro |
| PUT | `/api/cruds/:id/data/:rowId` | Atualizar registro |
| DELETE | `/api/cruds/:id/data/:rowId` | Excluir registro (logico) |
| POST | `/api/cruds/:id/import/validate` | Validar dados antes de importar |
| POST | `/api/cruds/:id/import` | Importar dados mapeados |
| GET | `/api/cruds/:id/export` | Exportar dados |
| POST | `/api/validate` | Validar valor com regra AI |
| GET | `/api/models` | Listar modelos AI disponiveis |
| GET | `/api/tools` | Listar biblioteca de tools de validacao |

## Tipos de dados suportados

| Tipo | Postgres | Descricao |
|------|----------|-----------|
| text | TEXT | Texto livre |
| integer | BIGINT | Numeros inteiros |
| decimal | NUMERIC(18,4) | Numeros decimais |
| boolean | BOOLEAN | Sim/Nao |
| date | DATE | Data (YYYY-MM-DD) |
| datetime | TIMESTAMP | Data e hora |

## Seguranca

- Credenciais nunca sao commitadas no repositorio (apenas placeholders no `app.yaml`)
- Senhas do Lakebase devem ser configuradas apenas no workspace
- Exclusao logica preserva dados (soft delete)
- Validacao de unicidade impede duplicatas
- Codigo de validacao AI executado em sandbox com builtins restritos

## Logs

Acesse `https://SEU-APP-URL/logz` para ver logs em tempo real.

## Licenca

MIT
