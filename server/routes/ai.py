import os
from fastapi import APIRouter
from server.models import ValidateRequest
from server.llm import list_models
from server.validators import validate_with_code, get_cached_code

router = APIRouter(tags=["ai"])


@router.post("/validate")
def validate_field(body: ValidateRequest):
    """Validate a value using LLM-generated code.

    The LLM writes Python validation code (cached per rule),
    which is then executed locally for 100% accuracy on
    deterministic rules like CPF, CNPJ, math, etc.
    """
    if not body.rule.strip():
        return {"valid": True, "message": ""}
    if not body.value.strip():
        return {"valid": True, "message": ""}

    return validate_with_code(body.value, body.rule, body.field_name, model=body.model)


@router.get("/models")
def get_models():
    """List available Foundation Models for validation."""
    default = os.environ.get("SERVING_ENDPOINT", "databricks-llama-4-maverick")
    models = list_models()
    return {"models": models, "default": default}


@router.get("/validate/debug")
def debug_validation(rule: str, field_name: str = ""):
    """Show the generated validation code for a rule (debug only)."""
    code = get_cached_code(rule, field_name)
    return {"rule": rule, "cached_code": code or "Not cached yet"}
