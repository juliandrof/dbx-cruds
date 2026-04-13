# DBX CRUDs

Aplicacao Databricks App para criacao generica de CRUDs com armazenamento no Lakebase. Ideal para substituir planilhas Excel e SharePoint por formularios estruturados com busca inteligente, importacao de dados e visual personalizavel.

## Funcionalidades

- **Criacao de CRUDs**: Defina nome, colunas e tipos de dados. Uma tabela no Lakebase e criada automaticamente
- **Importacao Excel (.xlsx)**: Upload com mapeamento visual coluna-a-coluna (de/para)
- **Busca inteligente**: Pesquisa em todos os campos de qualquer CRUD
- **Edicao completa**: Renomear, adicionar/remover colunas, alterar cor
- **Exclusao logica**: Dados sao preservados mas nao exibidos
- **Exportacao Excel**: Exporte os dados de qualquer CRUD para .xlsx
- **Personalizacao visual**: Tema claro/escuro + 12 cores de destaque
- **CRUD inline**: Adicione e edite registros diretamente na tabela
- **Operacoes em lote**: Selecione e exclua multiplos registros

## Pre-requisitos

1. **Workspace Databricks** com Lakebase habilitado (serverless)
2. **Databricks CLI** >= 0.229.0
3. **Node.js** >= 18
4. **Python** >= 3.10
5. **uv** (gerenciador de pacotes Python)

## Passo a passo para deploy

### 1. Clone o repositorio

```bash
git clone https://github.com/juliandrof/dbx-cruds.git
cd dbx-cruds
```

### 2. Instale o Databricks CLI (se ainda nao tiver)

```bash
# macOS
brew install databricks

# Ou atualize
brew upgrade databricks
```

### 3. Autentique no seu workspace

```bash
databricks auth login --host https://SEU-WORKSPACE.cloud.databricks.com --profile dbx-cruds
```

Substitua a URL pelo host do seu workspace. Isso vai abrir o navegador para login OAuth.

### 4. Crie uma instancia Lakebase

No Databricks UI:
1. Va em **Catalog** > **Lakebase** > **Create Database**
2. Anote o **Endpoint Name** no formato: `projects/<id>/branches/<id>/endpoints/<id>`

Ou via CLI:
```bash
databricks lakebase databases create --name dbx-cruds-db --profile dbx-cruds
```

### 5. Configure o app.yaml

Edite `app.yaml` e substitua `<SEU_ENDPOINT_NAME_AQUI>` pelo Endpoint Name da etapa anterior:

```yaml
env:
  - name: ENDPOINT_NAME
    value: 'projects/abc123/branches/main/endpoints/xyz789'
```

### 6. Compile o frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 7. Crie o App no Databricks

```bash
databricks apps create dbx-cruds --description "Criador generico de CRUDs" --profile dbx-cruds
```

### 8. Faca upload dos arquivos

```bash
# Substitua SEU_EMAIL pelo seu email do workspace
databricks sync . /Users/SEU_EMAIL/dbx-cruds \
  --exclude node_modules \
  --exclude .venv \
  --exclude __pycache__ \
  --exclude .git \
  --exclude "frontend/src" \
  --exclude "frontend/public" \
  --exclude "frontend/node_modules" \
  --profile dbx-cruds
```

### 9. Faca o deploy

```bash
databricks apps deploy dbx-cruds \
  --source-code-path /Workspace/Users/SEU_EMAIL/dbx-cruds \
  --profile dbx-cruds
```

### 10. Adicione o recurso Lakebase (IMPORTANTE)

No Databricks UI:
1. Va em **Compute** > **Apps** > **dbx-cruds** > **Edit**
2. Clique em **Add Resource** > **Database**
3. Selecione sua instancia Lakebase > Permission: **Can connect**
4. Clique em **Redeploy**

### 11. Acesse o app

```bash
# Veja a URL do app
databricks apps get dbx-cruds --profile dbx-cruds
```

A URL sera algo como: `https://dbx-cruds-XXXX.aws.databricksapps.com`

## Desenvolvimento local

### Backend

```bash
# Instale dependencias Python
pip install -r requirements.txt

# Configure o profile
export DATABRICKS_PROFILE=dbx-cruds

# Inicie o servidor
uvicorn app:app --reload --port 8000
```

### Frontend (modo dev)

```bash
cd frontend
npm install
npm run dev
# Acesse http://localhost:5173
```

O Vite esta configurado para fazer proxy das chamadas `/api/*` para `localhost:8000`.

## Estrutura do projeto

```
dbx-cruds/
├── app.yaml              # Config do Databricks App
├── app.py                # Entry point FastAPI
├── requirements.txt      # Dependencias Python
├── server/
│   ├── config.py         # Auth dual-mode (local/remote)
│   ├── db.py             # Conexao Lakebase + DDL dinamico
│   ├── models.py         # Modelos Pydantic
│   └── routes/
│       ├── cruds.py      # CRUD management API
│       ├── data.py       # Data operations API
│       └── imports.py    # Import/Export Excel API
├── frontend/
│   ├── src/
│   │   ├── components/   # Componentes reutilizaveis
│   │   ├── pages/        # Paginas da aplicacao
│   │   ├── store/        # Estado global (Zustand)
│   │   └── lib/          # API client
│   └── dist/             # Build de producao
└── README.md
```

## API Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/stats` | Estatisticas gerais |
| GET | `/api/cruds` | Listar CRUDs |
| POST | `/api/cruds` | Criar CRUD |
| GET | `/api/cruds/:id` | Detalhes do CRUD |
| PUT | `/api/cruds/:id` | Atualizar CRUD |
| DELETE | `/api/cruds/:id` | Excluir CRUD (logico) |
| POST | `/api/cruds/:id/columns` | Adicionar coluna |
| PUT | `/api/cruds/:id/columns/:colId` | Renomear coluna |
| DELETE | `/api/cruds/:id/columns/:colId` | Remover coluna (logico) |
| GET | `/api/cruds/:id/data` | Listar dados (busca, paginacao) |
| POST | `/api/cruds/:id/data` | Inserir registro |
| PUT | `/api/cruds/:id/data/:rowId` | Atualizar registro |
| DELETE | `/api/cruds/:id/data/:rowId` | Excluir registro (logico) |
| POST | `/api/cruds/:id/import` | Importar dados mapeados |
| GET | `/api/cruds/:id/export` | Exportar dados |

## Tipos de dados suportados

| Tipo | Postgres | Descricao |
|------|----------|-----------|
| text | TEXT | Texto livre |
| integer | BIGINT | Numeros inteiros |
| decimal | NUMERIC(18,4) | Numeros decimais |
| boolean | BOOLEAN | Sim/Nao |
| date | DATE | Data (YYYY-MM-DD) |
| datetime | TIMESTAMP | Data e hora |

## Solucao de problemas

### App nao inicia
- Verifique se o `ENDPOINT_NAME` esta correto no `app.yaml`
- Verifique se o recurso Lakebase foi adicionado ao app (etapa 10)

### Erro de autenticacao
- Verifique se o app tem permissao "Can connect" no Lakebase

### Frontend nao carrega
- Verifique se `npm run build` foi executado e a pasta `frontend/dist` existe

### Logs do app
- Acesse `https://SEU-APP-URL/logz` para ver logs em tempo real

## Licenca

MIT
