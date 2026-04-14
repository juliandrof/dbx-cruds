import os
from fastapi import APIRouter
from server.models import ValidateRequest
from server.llm import validate_value, list_models
from server.validators import detect_and_validate

router = APIRouter(tags=["ai"])


@router.post("/validate")
def validate_field(body: ValidateRequest):
    """Validate a value against a natural language rule.
    Uses deterministic code for known patterns (CPF, CNPJ, email, etc.)
    and falls back to AI for generic rules.
    """
    if not body.rule.strip():
        return {"valid": True, "message": ""}
    if not body.value.strip():
        return {"valid": True, "message": ""}

    # Try built-in validators first (fast, accurate, free)
    result = detect_and_validate(body.value, body.rule, body.field_name)
    if result is not None:
        return result

    # Fall back to AI for generic rules
    return validate_value(body.value, body.rule, body.field_name, model=body.model)


@router.get("/models")
def get_models():
    """List available Foundation Models for validation."""
    default = os.environ.get("SERVING_ENDPOINT", "databricks-llama-4-maverick")
    models = list_models()
    return {"models": models, "default": default}
