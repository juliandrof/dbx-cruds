import os
import json
from openai import OpenAI
from databricks.sdk import WorkspaceClient

_ws = None


def _get_ws() -> WorkspaceClient:
    global _ws
    if _ws is None:
        _ws = WorkspaceClient()
    return _ws


def _get_client() -> OpenAI:
    w = _get_ws()
    host = os.environ.get("DATABRICKS_HOST", "")
    if host and not host.startswith("http"):
        host = f"https://{host}"
    if not host:
        host = w.config.host
    auth = w.config.authenticate()
    token = auth.get("Authorization", "").replace("Bearer ", "") if isinstance(auth, dict) else ""
    if not token:
        token = os.environ.get("DATABRICKS_TOKEN", "")
    return OpenAI(api_key=token, base_url=f"{host}/serving-endpoints")


KNOWN_MODELS = [
    "databricks-llama-4-maverick",
    "databricks-meta-llama-3-3-70b-instruct",
    "databricks-meta-llama-3.1-405b-instruct",
    "databricks-meta-llama-3-1-8b-instruct",
    "databricks-claude-sonnet-4-6",
    "databricks-claude-sonnet-4-5",
    "databricks-claude-opus-4-6",
    "databricks-claude-haiku-4-5",
    "databricks-gpt-5-4",
    "databricks-gpt-5-4-mini",
    "databricks-gpt-5-2",
    "databricks-gpt-5-mini",
    "databricks-gemini-3-1-pro",
    "databricks-gemini-3-1-flash-lite",
    "databricks-gemini-3-pro",
    "databricks-gemini-3-flash",
    "databricks-qwen3-next-80b-a3b-instruct",
]


def list_models() -> list[str]:
    """List available Foundation Model serving endpoints."""
    try:
        w = _get_ws()
        endpoints = w.serving_endpoints.list()
        models = []
        for ep in endpoints:
            if ep.name and ep.name.startswith("databricks-") and ep.state and ep.state.ready == "READY":
                models.append(ep.name)
        if models:
            models.sort()
            return models
    except Exception:
        pass
    return KNOWN_MODELS


def validate_value(value: str, rule: str, field_name: str = "", model: str = "") -> dict:
    """Validate a value against a natural language rule using AI.
    Returns {"valid": bool, "message": str}
    """
    if not model:
        model = os.environ.get("SERVING_ENDPOINT", "databricks-llama-4-maverick")
    client = _get_client()

    prompt = f"""Voce e um validador de dados. Valide se o valor atende a regra.

Campo: {field_name}
Valor: {value}
Regra: {rule}

Responda APENAS com JSON valido no formato:
{{"valid": true}} se o valor e valido
{{"valid": false, "message": "explicacao curta do erro"}} se invalido

JSON:"""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150,
        temperature=0,
    )

    text = response.choices[0].message.content.strip()
    try:
        start = text.index("{")
        end = text.rindex("}") + 1
        result = json.loads(text[start:end])
        return {
            "valid": bool(result.get("valid", False)),
            "message": result.get("message", ""),
        }
    except (ValueError, json.JSONDecodeError):
        return {"valid": True, "message": "Nao foi possivel validar"}
