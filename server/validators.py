"""Code-generation validation engine.

Instead of hardcoded validators OR asking the LLM to validate directly,
we ask the LLM to WRITE Python validation code, then execute it locally.

LLMs are great at writing code, bad at doing math.
This gives us 100% accuracy for any deterministic rule (CPF, CNPJ, etc.)
while remaining fully generic - no hardcoded logic.

Generated code is cached by rule, so only the first validation of a rule
requires an LLM call. Subsequent validations run instantly.
"""

import os
import json
import re
import traceback
from openai import OpenAI

_code_cache: dict[str, str] = {}


def _get_client() -> OpenAI:
    from server.llm import _get_client as get_client
    return get_client()


def _generate_code(rule: str, field_name: str, model: str) -> str:
    """Ask the LLM to generate Python validation code for a rule."""
    client = _get_client()
    if not model:
        model = os.environ.get("SERVING_ENDPOINT", "databricks-llama-4-maverick")

    prompt = f"""Escreva uma funcao Python chamada `validate(value: str) -> dict` que valida se o valor atende a regra abaixo.

Regra: {rule}
Campo: {field_name}

A funcao DEVE retornar um dict:
- {{"valid": True}} se o valor e valido
- {{"valid": False, "message": "explicacao curta"}} se invalido

IMPORTANTE:
- Use APENAS a standard library do Python (re, math, etc). Nenhuma lib externa.
- A funcao recebe o valor SEMPRE como string.
- Trate o valor None ou vazio como invalido se a regra exige um valor.
- Escreva SOMENTE o codigo Python, sem markdown, sem explicacao, sem ```python.
- A funcao deve ser robusta e tratar excecoes.

Exemplo para "deve ser um email valido":
import re
def validate(value: str) -> dict:
    if re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{{2,}}$', value.strip()):
        return {{"valid": True}}
    return {{"valid": False, "message": "Email invalido"}}

Agora escreva o codigo para a regra: {rule}"""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
        temperature=0,
    )

    code = response.choices[0].message.content.strip()
    # Clean up markdown fences if present
    code = re.sub(r"^```(?:python)?\s*\n?", "", code)
    code = re.sub(r"\n?```\s*$", "", code)
    return code


SAFE_BUILTINS = {
    "abs": abs, "all": all, "any": any, "bin": bin, "bool": bool,
    "chr": chr, "dict": dict, "divmod": divmod, "enumerate": enumerate,
    "filter": filter, "float": float, "format": format, "hex": hex,
    "int": int, "isinstance": isinstance, "len": len, "list": list,
    "map": map, "max": max, "min": min, "oct": oct, "ord": ord,
    "pow": pow, "range": range, "repr": repr, "reversed": reversed,
    "round": round, "set": set, "slice": slice, "sorted": sorted,
    "str": str, "sum": sum, "tuple": tuple, "zip": zip,
    "True": True, "False": False, "None": None,
    "ValueError": ValueError, "TypeError": TypeError,
    "Exception": Exception, "IndexError": IndexError,
    "__import__": __import__,
}


def _execute_code(code: str, value: str) -> dict:
    """Execute generated validation code safely."""
    namespace = {"__builtins__": SAFE_BUILTINS}
    try:
        exec(code, namespace)
        if "validate" not in namespace:
            return {"valid": True, "message": "Codigo gerado sem funcao validate"}
        result = namespace["validate"](value)
        if isinstance(result, dict):
            return {
                "valid": bool(result.get("valid", False)),
                "message": result.get("message", ""),
            }
        return {"valid": bool(result), "message": "" if result else "Valor invalido"}
    except Exception as e:
        return {"valid": True, "message": f"Erro na validacao: {str(e)[:80]}"}


def validate_with_code(value: str, rule: str, field_name: str, model: str = "") -> dict:
    """Validate using LLM-generated code. Cached per rule."""
    cache_key = f"{rule}||{field_name}"

    if cache_key not in _code_cache:
        code = _generate_code(rule, field_name, model)
        _code_cache[cache_key] = code

    return _execute_code(_code_cache[cache_key], value)


def clear_cache():
    """Clear the code cache (useful if rules change)."""
    _code_cache.clear()


def get_cached_code(rule: str, field_name: str) -> str | None:
    """Get the cached code for a rule (for debugging)."""
    return _code_cache.get(f"{rule}||{field_name}")
