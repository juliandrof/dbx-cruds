import os
from fastapi import APIRouter
from server.models import ValidateRequest
from server.llm import validate_value, list_models

router = APIRouter(tags=["ai"])


@router.post("/validate")
def validate_field(body: ValidateRequest):
    """Validate a value against a natural language rule using AI."""
    if not body.rule.strip():
        return {"valid": True, "message": ""}
    if not body.value.strip():
        return {"valid": True, "message": ""}
    return validate_value(body.value, body.rule, body.field_name, model=body.model)


@router.get("/models")
def get_models():
    """List available Foundation Models for validation."""
    default = os.environ.get("SERVING_ENDPOINT", "databricks-llama-4-maverick")
    models = list_models()
    return {"models": models, "default": default}
