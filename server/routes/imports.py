from fastapi import APIRouter, HTTPException, UploadFile, File
from server.db import pool
from server.models import ImportData
from server.routes.data import _cast_value
import io
import openpyxl

router = APIRouter(tags=["imports"])


@router.post("/cruds/{crud_id}/import/preview")
async def preview_excel(crud_id: int, file: UploadFile = File(...)):
    """Read Excel file and return column names + sample data for mapping UI."""
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Apenas arquivos .xlsx são suportados")

    content = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    if ws is None:
        raise HTTPException(400, "Planilha vazia")

    rows_iter = ws.iter_rows(values_only=True)
    headers = next(rows_iter, None)
    if not headers:
        raise HTTPException(400, "Nenhum cabeçalho encontrado")

    headers = [str(h).strip() if h else f"Coluna_{i}" for i, h in enumerate(headers)]

    sample_data = []
    for i, row in enumerate(rows_iter):
        if i >= 5:
            break
        sample_data.append([str(v) if v is not None else "" for v in row])

    total_rows = ws.max_row - 1 if ws.max_row else 0
    wb.close()

    return {
        "file_name": file.filename,
        "headers": headers,
        "sample_data": sample_data,
        "total_rows": total_rows,
    }


@router.post("/cruds/{crud_id}/import")
def import_data(crud_id: int, body: ImportData):
    """Import mapped data into the CRUD table."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT table_name FROM crud_definitions WHERE id = %s AND is_deleted = FALSE",
                (crud_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "CRUD não encontrado")
            table_name = row[0]

            cur.execute(
                """SELECT db_column, data_type FROM crud_columns
                   WHERE crud_id = %s AND is_deleted = FALSE""",
                (crud_id,),
            )
            col_types = {r[0]: r[1] for r in cur.fetchall()}

            # Validate mapping
            valid_mappings = {}
            for crud_col, excel_col in body.mapping.items():
                if crud_col in col_types and excel_col:
                    valid_mappings[crud_col] = excel_col

            if not valid_mappings:
                raise HTTPException(400, "Nenhum mapeamento válido")

            inserted = 0
            errors = 0

            for excel_row in body.rows:
                insert_cols = []
                insert_vals = []
                params = []

                for crud_col, excel_col in valid_mappings.items():
                    val = excel_row.get(excel_col)
                    insert_cols.append(f'"{crud_col}"')
                    insert_vals.append("%s")
                    params.append(_cast_value(val, col_types[crud_col]))

                try:
                    cur.execute(
                        f"""INSERT INTO "{table_name}" ({', '.join(insert_cols)})
                            VALUES ({', '.join(insert_vals)})""",
                        params,
                    )
                    inserted += 1
                except Exception:
                    errors += 1

            conn.commit()

    return {
        "inserted": inserted,
        "errors": errors,
        "message": f"{inserted} registros importados com sucesso"
        + (f", {errors} com erro" if errors else ""),
    }


@router.get("/cruds/{crud_id}/export")
def export_data(crud_id: int):
    """Export all data as JSON (frontend converts to Excel)."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT table_name FROM crud_definitions WHERE id = %s AND is_deleted = FALSE",
                (crud_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "CRUD não encontrado")
            table_name = row[0]

            cur.execute(
                """SELECT name, db_column, data_type FROM crud_columns
                   WHERE crud_id = %s AND is_deleted = FALSE ORDER BY position""",
                (crud_id,),
            )
            columns = [{"name": r[0], "db_column": r[1], "data_type": r[2]} for r in cur.fetchall()]

            db_cols = [c["db_column"] for c in columns]
            select_cols = ", ".join(f'"{c}"' for c in db_cols)

            cur.execute(
                f'SELECT _id, {select_cols} FROM "{table_name}" WHERE _is_deleted = FALSE ORDER BY _id'
            )
            rows = cur.fetchall()

    data = []
    for row in rows:
        item = {}
        for i, col in enumerate(columns):
            val = row[1 + i]
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            item[col["name"]] = val
        data.append(item)

    return {"columns": [c["name"] for c in columns], "data": data}
