from fastapi import APIRouter, HTTPException, Query
from server.db import pool
from server.models import RowCreate, RowUpdate

router = APIRouter(tags=["data"])


def _get_crud_meta(cur, crud_id: int):
    cur.execute(
        "SELECT table_name FROM crud_definitions WHERE id = %s AND is_deleted = FALSE",
        (crud_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(404, "CRUD não encontrado")
    table_name = row[0]

    cur.execute(
        """SELECT db_column, name, data_type FROM crud_columns
           WHERE crud_id = %s AND is_deleted = FALSE ORDER BY position""",
        (crud_id,),
    )
    columns = [{"db_column": r[0], "name": r[1], "data_type": r[2]} for r in cur.fetchall()]
    return table_name, columns


@router.get("/cruds/{crud_id}/data")
def list_data(
    crud_id: int,
    search: str = Query("", description="Busca em todos os campos"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    sort_by: str = Query("_created_at", description="Coluna para ordenação"),
    sort_dir: str = Query("desc", description="asc ou desc"),
):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            table_name, columns = _get_crud_meta(cur, crud_id)

            db_cols = [c["db_column"] for c in columns]
            select_cols = ", ".join(f'"{c}"' for c in db_cols)

            where_clauses = ["_is_deleted = FALSE"]
            params: list = []

            if search.strip():
                search_clauses = []
                for col in db_cols:
                    search_clauses.append(f'CAST("{col}" AS TEXT) ILIKE %s')
                    params.append(f"%{search.strip()}%")
                where_clauses.append(f"({' OR '.join(search_clauses)})")

            where_sql = " AND ".join(where_clauses)

            # Validate sort column
            valid_sorts = db_cols + ["_id", "_created_at", "_updated_at"]
            if sort_by not in valid_sorts:
                sort_by = "_created_at"
            direction = "ASC" if sort_dir.lower() == "asc" else "DESC"

            offset = (page - 1) * page_size

            # Count
            cur.execute(
                f'SELECT COUNT(*) FROM "{table_name}" WHERE {where_sql}',
                params,
            )
            total = cur.fetchone()[0]

            # Data
            cur.execute(
                f"""SELECT _id, {select_cols}, _created_at, _updated_at
                    FROM "{table_name}"
                    WHERE {where_sql}
                    ORDER BY "{sort_by}" {direction}
                    LIMIT %s OFFSET %s""",
                params + [page_size, offset],
            )
            rows = cur.fetchall()

    data = []
    for row in rows:
        item = {"_id": row[0]}
        for i, col in enumerate(columns):
            val = row[1 + i]
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            item[col["db_column"]] = val
        item["_created_at"] = row[-2].isoformat() if row[-2] else None
        item["_updated_at"] = row[-1].isoformat() if row[-1] else None
        data.append(item)

    return {
        "data": data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.post("/cruds/{crud_id}/data")
def create_row(crud_id: int, body: RowCreate):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            table_name, columns = _get_crud_meta(cur, crud_id)

            valid_cols = {c["db_column"]: c for c in columns}
            insert_cols = []
            insert_vals = []
            params = []

            for key, val in body.data.items():
                if key in valid_cols:
                    insert_cols.append(f'"{key}"')
                    insert_vals.append("%s")
                    params.append(_cast_value(val, valid_cols[key]["data_type"]))

            # Check required
            for col in columns:
                if col["is_required"] and col["db_column"] not in body.data:
                    raise HTTPException(400, f"Campo obrigatório: {col['name']}")

            if not insert_cols:
                raise HTTPException(400, "Nenhum dado fornecido")

            cur.execute(
                f"""INSERT INTO "{table_name}" ({', '.join(insert_cols)})
                    VALUES ({', '.join(insert_vals)})
                    RETURNING _id, _created_at""",
                params,
            )
            row = cur.fetchone()
        conn.commit()

    return {"_id": row[0], "_created_at": row[1].isoformat() if row[1] else None}


@router.put("/cruds/{crud_id}/data/{row_id}")
def update_row(crud_id: int, row_id: int, body: RowUpdate):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            table_name, columns = _get_crud_meta(cur, crud_id)

            valid_cols = {c["db_column"]: c for c in columns}
            set_parts = []
            params = []

            for key, val in body.data.items():
                if key in valid_cols:
                    set_parts.append(f'"{key}" = %s')
                    params.append(_cast_value(val, valid_cols[key]["data_type"]))

            if not set_parts:
                raise HTTPException(400, "Nenhum dado para atualizar")

            set_parts.append("_updated_at = CURRENT_TIMESTAMP")
            params.extend([row_id])

            cur.execute(
                f"""UPDATE "{table_name}" SET {', '.join(set_parts)}
                    WHERE _id = %s AND _is_deleted = FALSE""",
                params,
            )
            if cur.rowcount == 0:
                raise HTTPException(404, "Registro não encontrado")
        conn.commit()

    return {"message": "Registro atualizado"}


@router.delete("/cruds/{crud_id}/data/{row_id}")
def delete_row(crud_id: int, row_id: int):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            table_name, _ = _get_crud_meta(cur, crud_id)
            cur.execute(
                f"""UPDATE "{table_name}" SET _is_deleted = TRUE, _updated_at = CURRENT_TIMESTAMP
                    WHERE _id = %s AND _is_deleted = FALSE""",
                (row_id,),
            )
            if cur.rowcount == 0:
                raise HTTPException(404, "Registro não encontrado")
        conn.commit()

    return {"message": "Registro excluído"}


@router.post("/cruds/{crud_id}/data/batch-delete")
def batch_delete(crud_id: int, row_ids: list[int]):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            table_name, _ = _get_crud_meta(cur, crud_id)
            placeholders = ", ".join(["%s"] * len(row_ids))
            cur.execute(
                f"""UPDATE "{table_name}" SET _is_deleted = TRUE, _updated_at = CURRENT_TIMESTAMP
                    WHERE _id IN ({placeholders}) AND _is_deleted = FALSE""",
                row_ids,
            )
        conn.commit()
    return {"message": f"{len(row_ids)} registros excluídos"}


def _cast_value(val, data_type: str):
    if val is None or val == "":
        return None
    if data_type == "integer":
        try:
            return int(val)
        except (ValueError, TypeError):
            return None
    if data_type == "decimal":
        try:
            return float(val)
        except (ValueError, TypeError):
            return None
    if data_type == "boolean":
        if isinstance(val, bool):
            return val
        return str(val).lower() in ("true", "1", "sim", "yes", "s")
    return str(val)
