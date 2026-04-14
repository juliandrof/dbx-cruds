import os
from fastapi import APIRouter
from server.models import ValidateRequest
from server.llm import list_models
from server.validators import validate_with_code, list_tools

router = APIRouter(tags=["ai"])


@router.post("/validate")
def validate_field(body: ValidateRequest):
    """Validate a value using the tool library.
    Reuses existing tools when possible, generates new ones via LLM when needed.
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


@router.get("/tools")
def get_tools():
    """List all validation tools in the library."""
    tools = list_tools()
    return {"tools": tools, "total": len(tools)}
