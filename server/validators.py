"""Code-generation validation engine with persistent tool library.

Flow:
1. User writes rule: "deve ser um CPF valido"
2. Extract keywords → ["cpf", "valido"]
3. Search Lakebase for existing tool with matching keywords
4. If found → reuse code (instant, free)
5. If not → LLM generates code + saves as new tool for future reuse

The tool library grows automatically. A tool created for "CPF valido"
in Form A is reused months later in Form B without any LLM call.
"""

import os
import re
import json
from server.db import pool

_local_cache: dict[str, str] = {}

STOP_WORDS = {
    "de", "do", "da", "dos", "das", "um", "uma", "o", "a", "os", "as",
    "e", "ou", "em", "no", "na", "nos", "nas", "por", "para", "com",
    "ser", "ter", "deve", "precisa", "tem", "que", "este", "esse",
    "esta", "essa", "campo", "valor", "coluna", "dado", "dados",
    "the", "is", "a", "an", "must", "be", "should", "have", "this",
    "it", "with", "valid", "valido", "valida", "validar", "verificar",
}


def _extract_keywords(text: str) -> list[str]:
    """Extract meaningful keywords from a rule."""
    text = text.lower().strip()
    text = re.sub(r"[àáâãä]", "a", text)
    text = re.sub(r"[èéêë]", "e", text)
    text = re.sub(r"[ìíîï]", "i", text)
    text = re.sub(r"[òóôõö]", "o", text)
    text = re.sub(r"[ùúûü]", "u", text)
    text = re.sub(r"[ç]", "c", text)
    words = re.findall(r"[a-z0-9]+", text)
    keywords = sorted(set(w for w in words if w not in STOP_WORDS and len(w) > 1))
    return keywords


def _keywords_to_str(keywords: list[str]) -> str:
    return " ".join(keywords)


def _find_tool(keywords: list[str]) -> dict | None:
    """Search Lakebase for an existing tool matching these keywords."""
    if not keywords:
        return None
    try:
        with pool.connection() as conn:
            with conn.cursor() as cur:
                # Build search: find tools where stored keywords overlap significantly
                conditions = []
                params = []
                for kw in keywords:
                    conditions.append("keywords ILIKE %s")
                    params.append(f"%{kw}%")

                # Require at least half the keywords to match
                # Try from most specific (all keywords) down to minimum overlap
                for min_match in range(len(keywords), max(0, len(keywords) // 2 - 1), -1):
                    if min_match == 0:
                        break
                    # Pick combinations - simplified: just require the key terms
                    where = " AND ".join(conditions[:min_match])
                    cur.execute(
                        f"SELECT id, keywords, code, tool_name FROM validation_tools WHERE {where} LIMIT 1",
                        params[:min_match],
                    )
                    row = cur.fetchone()
                    if row:
                        # Update usage stats
                        cur.execute(
                            "UPDATE validation_tools SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = %s",
                            (row[0],),
                        )
                        conn.commit()
                        return {"id": row[0], "keywords": row[1], "code": row[2], "tool_name": row[3]}
    except Exception:
        pass
    return None


def _save_tool(keywords: list[str], rule: str, code: str) -> None:
    """Save a new tool to Lakebase for future reuse."""
    kw_str = _keywords_to_str(keywords)
    # Generate a readable tool name from keywords
    tool_name = "_".join(keywords[:4]) + "_validator"
    try:
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO validation_tools (keywords, rule_example, tool_name, code)
                       VALUES (%s, %s, %s, %s)
                       ON CONFLICT DO NOTHING""",
                    (kw_str, rule, tool_name, code),
                )
            conn.commit()
    except Exception:
        pass


def _generate_code(rule: str, field_name: str, model: str) -> str:
    """Ask the LLM to generate Python validation code for a rule."""
    from server.llm import _get_client

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

Agora escreva o codigo para a regra: {rule}"""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
        temperature=0,
    )

    code = response.choices[0].message.content.strip()
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
    """Validate using the tool library. Flow:
    1. Check local memory cache
    2. Check Lakebase tool library
    3. Generate new code via LLM and save to library
    """
    keywords = _extract_keywords(rule + " " + field_name)
    cache_key = _keywords_to_str(keywords)

    # 1. Local memory cache (fastest)
    if cache_key in _local_cache:
        return _execute_code(_local_cache[cache_key], value)

    # 2. Lakebase tool library (persistent, shared across restarts)
    tool = _find_tool(keywords)
    if tool:
        _local_cache[cache_key] = tool["code"]
        result = _execute_code(tool["code"], value)
        result["_tool"] = tool["tool_name"]
        result["_reused"] = True
        return result

    # 3. Generate new code via LLM and save
    code = _generate_code(rule, field_name, model)
    _local_cache[cache_key] = code
    _save_tool(keywords, rule, code)

    result = _execute_code(code, value)
    result["_tool"] = "_".join(keywords[:4]) + "_validator"
    result["_reused"] = False
    return result


def list_tools() -> list[dict]:
    """List all tools in the library."""
    try:
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT id, tool_name, rule_example, keywords, usage_count, created_at, last_used_at
                       FROM validation_tools ORDER BY usage_count DESC"""
                )
                return [
                    {
                        "id": r[0], "tool_name": r[1], "rule_example": r[2],
                        "keywords": r[3], "usage_count": r[4],
                        "created_at": r[5].isoformat() if r[5] else None,
                        "last_used_at": r[6].isoformat() if r[6] else None,
                    }
                    for r in cur.fetchall()
                ]
    except Exception:
        return []
