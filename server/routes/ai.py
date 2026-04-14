from fastapi import APIRouter
from server.models import ValidateRequest
from server.llm import validate_value

router = APIRouter(tags=["ai"])


@router.post("/validate")
def validate_field(body: ValidateRequest):
    """Validate a value against a natural language rule using AI."""
    if not body.rule.strip():
        return {"valid": True, "message": ""}
    if not body.value.strip():
        return {"valid": True, "message": ""}
    return validate_value(body.value, body.rule, body.field_name)
