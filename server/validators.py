"""Built-in deterministic validators for common data rules.

When a validation rule matches a known pattern (CPF, CNPJ, email, etc.),
we use fast, accurate code instead of AI. Unknown rules fall through to the LLM.
"""

import re

# Keywords that trigger each validator
_CPF_KEYWORDS = ["cpf"]
_CNPJ_KEYWORDS = ["cnpj"]
_EMAIL_KEYWORDS = ["email", "e-mail"]
_PHONE_KEYWORDS = ["telefone", "celular", "phone", "fone"]
_CEP_KEYWORDS = ["cep", "codigo postal", "zip"]


def detect_and_validate(value: str, rule: str, field_name: str) -> dict | None:
    """Try to match the rule to a built-in validator.
    Returns {"valid": bool, "message": str} if matched, None if no match (fall through to AI).
    """
    rule_lower = rule.lower()
    field_lower = field_name.lower()
    combined = rule_lower + " " + field_lower

    if _matches(combined, _CPF_KEYWORDS):
        return validate_cpf(value)
    if _matches(combined, _CNPJ_KEYWORDS):
        return validate_cnpj(value)
    if _matches(combined, _EMAIL_KEYWORDS):
        return validate_email(value)
    if _matches(combined, _PHONE_KEYWORDS):
        return validate_phone(value)
    if _matches(combined, _CEP_KEYWORDS):
        return validate_cep(value)

    return None  # No built-in match, use AI


def _matches(text: str, keywords: list[str]) -> bool:
    return any(kw in text for kw in keywords)


def validate_cpf(value: str) -> dict:
    digits = re.sub(r"\D", "", value)
    if len(digits) != 11:
        return {"valid": False, "message": "CPF deve ter 11 digitos"}
    if digits == digits[0] * 11:
        return {"valid": False, "message": "CPF invalido (todos digitos iguais)"}

    # First check digit
    total = sum(int(digits[i]) * (10 - i) for i in range(9))
    d1 = 11 - (total % 11)
    d1 = 0 if d1 >= 10 else d1
    if int(digits[9]) != d1:
        return {"valid": False, "message": "CPF invalido (digito verificador incorreto)"}

    # Second check digit
    total = sum(int(digits[i]) * (11 - i) for i in range(10))
    d2 = 11 - (total % 11)
    d2 = 0 if d2 >= 10 else d2
    if int(digits[10]) != d2:
        return {"valid": False, "message": "CPF invalido (digito verificador incorreto)"}

    return {"valid": True, "message": ""}


def validate_cnpj(value: str) -> dict:
    digits = re.sub(r"\D", "", value)
    if len(digits) != 14:
        return {"valid": False, "message": "CNPJ deve ter 14 digitos"}
    if digits == digits[0] * 14:
        return {"valid": False, "message": "CNPJ invalido (todos digitos iguais)"}

    # First check digit
    weights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    total = sum(int(digits[i]) * weights[i] for i in range(12))
    d1 = 11 - (total % 11)
    d1 = 0 if d1 >= 10 else d1
    if int(digits[12]) != d1:
        return {"valid": False, "message": "CNPJ invalido (digito verificador incorreto)"}

    # Second check digit
    weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    total = sum(int(digits[i]) * weights[i] for i in range(13))
    d2 = 11 - (total % 11)
    d2 = 0 if d2 >= 10 else d2
    if int(digits[13]) != d2:
        return {"valid": False, "message": "CNPJ invalido (digito verificador incorreto)"}

    return {"valid": True, "message": ""}


def validate_email(value: str) -> dict:
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if re.match(pattern, value.strip()):
        return {"valid": True, "message": ""}
    return {"valid": False, "message": "Email invalido"}


def validate_phone(value: str) -> dict:
    digits = re.sub(r"\D", "", value)
    if len(digits) < 10 or len(digits) > 13:
        return {"valid": False, "message": "Telefone deve ter entre 10 e 13 digitos"}
    return {"valid": True, "message": ""}


def validate_cep(value: str) -> dict:
    digits = re.sub(r"\D", "", value)
    if len(digits) != 8:
        return {"valid": False, "message": "CEP deve ter 8 digitos"}
    return {"valid": True, "message": ""}
