import os
import json
from openai import OpenAI
from databricks.sdk import WorkspaceClient


def _get_client() -> OpenAI:
    w = WorkspaceClient()
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


def validate_value(value: str, rule: str, field_name: str = "") -> dict:
    """Validate a value against a natural language rule using AI.
    Returns {"valid": bool, "message": str}
    """
    model = os.environ.get("SERVING_ENDPOINT", "databricks-llama-4-maverick")
    client = _get_client()

    prompt = f"""Você é um validador de dados. Valide se o valor atende à regra.

Campo: {field_name}
Valor: {value}
Regra: {rule}

Responda APENAS com JSON válido no formato:
{{"valid": true}} se o valor é válido
{{"valid": false, "message": "explicação curta do erro"}} se inválido

JSON:"""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150,
        temperature=0,
    )

    text = response.choices[0].message.content.strip()
    # Extract JSON from response
    try:
        # Try to find JSON in the response
        start = text.index("{")
        end = text.rindex("}") + 1
        result = json.loads(text[start:end])
        return {
            "valid": bool(result.get("valid", False)),
            "message": result.get("message", ""),
        }
    except (ValueError, json.JSONDecodeError):
        return {"valid": True, "message": "Não foi possível validar"}
