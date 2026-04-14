from fastapi import APIRouter, HTTPException
from server.db import pool, sanitize_name, create_data_table, add_column_to_table
from server.models import CrudCreate, CrudUpdate, ColumnAdd, ColumnUpdate

router = APIRouter(tags=["cruds"])


@router.get("/cruds")
def list_cruds():
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, name, description, table_name, color, is_favorite, created_at, updated_at
                FROM crud_definitions
                WHERE is_deleted = FALSE
                ORDER BY is_favorite DESC, updated_at DESC
            """)
            cruds = cur.fetchall()

            result = []
            for c in cruds:
                crud_id, name, desc, table_name, color, fav, created, updated = c
                # Get column count
                cur.execute(
                    "SELECT COUNT(*) FROM crud_columns WHERE crud_id = %s AND is_deleted = FALSE",
                    (crud_id,),
                )
                col_count = cur.fetchone()[0]
                # Get row count
                try:
                    cur.execute(f'SELECT COUNT(*) FROM "{table_name}" WHERE _is_deleted = FALSE')
                    row_count = cur.fetchone()[0]
                except Exception:
                    row_count = 0
                result.append({
                    "id": crud_id,
                    "name": name,
                    "description": desc,
                    "table_name": table_name,
                    "color": color,
                    "is_favorite": fav,
                    "column_count": col_count,
                    "row_count": row_count,
                    "created_at": created.isoformat() if created else None,
                    "updated_at": updated.isoformat() if updated else None,
                })
    return result


@router.post("/cruds")
def create_crud(body: CrudCreate):
    if not body.columns:
        raise HTTPException(400, "É necessário definir pelo menos uma coluna")

    table_name = "crud_" + sanitize_name(body.name)

    columns_meta = []
    for i, col in enumerate(body.columns):
        db_col = sanitize_name(col.name)
        columns_meta.append({
            "name": col.name,
            "db_column": db_col,
            "data_type": col.data_type,
            "is_required": col.is_required,
            "validation_rule": col.validation_rule,
            "position": i,
        })

    with pool.connection() as conn:
        with conn.cursor() as cur:
            # Check unique table name
            cur.execute("SELECT id FROM crud_definitions WHERE table_name = %s AND is_deleted = FALSE", (table_name,))
            if cur.fetchone():
                # Append numeric suffix
                cur.execute(
                    "SELECT COUNT(*) FROM crud_definitions WHERE table_name LIKE %s",
                    (table_name + "%",),
                )
                cnt = cur.fetchone()[0]
                table_name = f"{table_name}_{cnt}"

            cur.execute(
                """INSERT INTO crud_definitions (name, description, table_name, color)
                   VALUES (%s, %s, %s, %s) RETURNING id, created_at""",
                (body.name, body.description, table_name, body.color),
            )
            row = cur.fetchone()
            crud_id = row[0]

            for cm in columns_meta:
                cur.execute(
                    """INSERT INTO crud_columns (crud_id, name, db_column, data_type, is_required, validation_rule, position)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (crud_id, cm["name"], cm["db_column"], cm["data_type"], cm["is_required"], cm["validation_rule"], cm["position"]),
                )
        conn.commit()

    create_data_table(table_name, columns_meta)

    return {"id": crud_id, "table_name": table_name, "message": "CRUD criado com sucesso"}


@router.get("/cruds/{crud_id}")
def get_crud(crud_id: int):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, name, description, table_name, color, is_favorite, created_at, updated_at
                   FROM crud_definitions WHERE id = %s AND is_deleted = FALSE""",
                (crud_id,),
            )
            c = cur.fetchone()
            if not c:
                raise HTTPException(404, "CRUD não encontrado")

            cur.execute(
                """SELECT id, name, db_column, data_type, is_required, position, COALESCE(validation_rule, '')
                   FROM crud_columns
                   WHERE crud_id = %s AND is_deleted = FALSE
                   ORDER BY position""",
                (crud_id,),
            )
            columns = [
                {
                    "id": r[0],
                    "name": r[1],
                    "db_column": r[2],
                    "data_type": r[3],
                    "is_required": r[4],
                    "position": r[5],
                    "validation_rule": r[6],
                }
                for r in cur.fetchall()
            ]

            # Row count
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{c[3]}" WHERE _is_deleted = FALSE')
                row_count = cur.fetchone()[0]
            except Exception:
                row_count = 0

    return {
        "id": c[0],
        "name": c[1],
        "description": c[2],
        "table_name": c[3],
        "color": c[4],
        "is_favorite": c[5],
        "created_at": c[6].isoformat() if c[6] else None,
        "updated_at": c[7].isoformat() if c[7] else None,
        "columns": columns,
        "row_count": row_count,
    }


@router.put("/cruds/{crud_id}")
def update_crud(crud_id: int, body: CrudUpdate):
    updates = []
    params = []
    if body.name is not None:
        updates.append("name = %s")
        params.append(body.name)
    if body.description is not None:
        updates.append("description = %s")
        params.append(body.description)
    if body.color is not None:
        updates.append("color = %s")
        params.append(body.color)
    if body.is_favorite is not None:
        updates.append("is_favorite = %s")
        params.append(body.is_favorite)

    if not updates:
        raise HTTPException(400, "Nenhum campo para atualizar")

    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(crud_id)

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE crud_definitions SET {', '.join(updates)} WHERE id = %s AND is_deleted = FALSE",
                params,
            )
            if cur.rowcount == 0:
                raise HTTPException(404, "CRUD não encontrado")
        conn.commit()
    return {"message": "CRUD atualizado com sucesso"}


@router.delete("/cruds/{crud_id}")
def delete_crud(crud_id: int):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE crud_definitions SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = %s AND is_deleted = FALSE",
                (crud_id,),
            )
            if cur.rowcount == 0:
                raise HTTPException(404, "CRUD não encontrado")
        conn.commit()
    return {"message": "CRUD excluído com sucesso"}


# --- Column management ---


@router.post("/cruds/{crud_id}/columns")
def add_column(crud_id: int, body: ColumnAdd):
    db_col = sanitize_name(body.name)
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
                "SELECT COALESCE(MAX(position), -1) + 1 FROM crud_columns WHERE crud_id = %s",
                (crud_id,),
            )
            next_pos = cur.fetchone()[0]

            cur.execute(
                """INSERT INTO crud_columns (crud_id, name, db_column, data_type, is_required, validation_rule, position)
                   VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                (crud_id, body.name, db_col, body.data_type, body.is_required, body.validation_rule, next_pos),
            )
            col_id = cur.fetchone()[0]

            cur.execute(
                "UPDATE crud_definitions SET updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (crud_id,),
            )
        conn.commit()

    add_column_to_table(table_name, db_col, body.data_type)
    return {"id": col_id, "db_column": db_col, "message": "Coluna adicionada"}


@router.put("/cruds/{crud_id}/columns/{col_id}")
def update_column(crud_id: int, col_id: int, body: ColumnUpdate):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            updates = []
            params = []
            if body.name is not None:
                updates.append("name = %s")
                params.append(body.name)
            if body.validation_rule is not None:
                updates.append("validation_rule = %s")
                params.append(body.validation_rule)
            if not updates:
                raise HTTPException(400, "Nada para atualizar")
            params.extend([col_id, crud_id])
            cur.execute(
                f"UPDATE crud_columns SET {', '.join(updates)} WHERE id = %s AND crud_id = %s AND is_deleted = FALSE",
                params,
            )
            if cur.rowcount == 0:
                raise HTTPException(404, "Coluna não encontrada")
            cur.execute(
                "UPDATE crud_definitions SET updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (crud_id,),
            )
        conn.commit()
    return {"message": "Coluna atualizada"}


@router.delete("/cruds/{crud_id}/columns/{col_id}")
def delete_column(crud_id: int, col_id: int):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE crud_columns SET is_deleted = TRUE WHERE id = %s AND crud_id = %s AND is_deleted = FALSE",
                (col_id, crud_id),
            )
            if cur.rowcount == 0:
                raise HTTPException(404, "Coluna não encontrada")
            cur.execute(
                "UPDATE crud_definitions SET updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (crud_id,),
            )
        conn.commit()
    return {"message": "Coluna removida"}


@router.get("/stats")
def get_stats():
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM crud_definitions WHERE is_deleted = FALSE")
            total_cruds = cur.fetchone()[0]

            cur.execute(
                "SELECT id, table_name FROM crud_definitions WHERE is_deleted = FALSE"
            )
            total_rows = 0
            for row in cur.fetchall():
                try:
                    cur.execute(f'SELECT COUNT(*) FROM "{row[1]}" WHERE _is_deleted = FALSE')
                    total_rows += cur.fetchone()[0]
                except Exception:
                    pass

            cur.execute("SELECT COUNT(*) FROM crud_columns WHERE is_deleted = FALSE")
            total_columns = cur.fetchone()[0]

    return {
        "total_cruds": total_cruds,
        "total_rows": total_rows,
        "total_columns": total_columns,
    }
