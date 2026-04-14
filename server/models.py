from pydantic import BaseModel


class ColumnCreate(BaseModel):
    name: str
    data_type: str = "text"
    is_required: bool = False
    validation_rule: str = ""


class CrudCreate(BaseModel):
    name: str
    description: str = ""
    color: str = "#6366f1"
    columns: list[ColumnCreate]


class CrudUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    is_favorite: bool | None = None


class ColumnAdd(BaseModel):
    name: str
    data_type: str = "text"
    is_required: bool = False
    validation_rule: str = ""


class ColumnUpdate(BaseModel):
    name: str | None = None
    validation_rule: str | None = None


class ValidateRequest(BaseModel):
    value: str
    rule: str
    field_name: str = ""
    model: str = ""


class RowCreate(BaseModel):
    data: dict


class RowUpdate(BaseModel):
    data: dict


class ImportData(BaseModel):
    mapping: dict[str, str]  # crud_column_db_name -> excel_column_name
    rows: list[dict]
