"""
app/services/ai_service.py
─────────────────────────────────────────────────────────────────────────────
Calls Azure OpenAI to generate an audit-quality narrative summary.
Falls back gracefully if no API key is configured.
─────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

from openai import AsyncAzureOpenAI
from app.config import get_settings

_client: AsyncAzureOpenAI | None = None


def _get_client() -> AsyncAzureOpenAI | None:
    global _client
    if _client is None:
        s = get_settings()
        if not s.azure_oai_key or not s.azure_oai_endpoint:
            return None
        _client = AsyncAzureOpenAI(
            api_key=s.azure_oai_key,
            azure_endpoint=s.azure_oai_endpoint,
            api_version=s.azure_oai_api_version,
        )
    return _client


async def generate_ai_summary(
    file_name: str,
    procedure_results: list[str],
    total_flags: int,
) -> str:
    """
    Generate a 3-4 sentence audit narrative.
    Falls back to a plain-text summary if Azure OpenAI is not configured.
    """
    client = _get_client()

    if not client:
        return _fallback_summary(file_name, procedure_results, total_flags)

    settings = get_settings()
    bullet_list = "\n".join(f"- {r}" for r in procedure_results) or "- No procedures ran"

    prompt = (
        f"You are a senior forensic auditor writing an audit workpaper summary.\n\n"
        f"File analysed: '{file_name}'\n"
        f"Total flags raised: {total_flags}\n\n"
        f"Procedure results:\n{bullet_list}\n\n"
        f"Write a 3-4 sentence professional summary. "
        f"Lead with the highest-risk findings. "
        f"Be factual and concise. Do not use bullet points."
    )

    try:
        response = await client.chat.completions.create(
            model=settings.azure_oai_deployment,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.2,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return _fallback_summary(file_name, procedure_results, total_flags)


def _fallback_summary(
    file_name: str,
    procedure_results: list[str],
    total_flags: int,
) -> str:
    if not procedure_results:
        return (
            f"Analysis of '{file_name}' completed with no anomalies detected "
            f"across the selected procedures."
        )

    high   = [r for r in procedure_results if "High"   in r]
    medium = [r for r in procedure_results if "Medium" in r]
    low    = [r for r in procedure_results if "Low"    in r]

    parts: list[str] = [
        f"Analysis of '{file_name}' raised {total_flags} flag(s) "
        f"across {len(procedure_results)} procedure(s)."
    ]
    if high:
        parts.append(f"High-risk findings: {'; '.join(high)}.")
    if medium:
        parts.append(f"Medium-risk findings: {'; '.join(medium)}.")
    if low:
        parts.append(f"Low-risk findings: {'; '.join(low)}.")

    parts.append(
        "Review all flagged items and escalate high-risk findings for further investigation."
    )
    return " ".join(parts)