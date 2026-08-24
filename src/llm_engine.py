import os
import json
import requests

from dotenv import load_dotenv


load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

MODEL = "gemini-3.5-flash-lite"

URL = (
    f"https://generativelanguage.googleapis.com/"
    f"v1beta/models/{MODEL}:generateContent"
)


def build_prompt(evidence):

    return f"""
You are a financial data analyst.

Analyze the following statistically detected market event.

Evidence:
{json.dumps(evidence, indent=2)}

Provide:

1. What happened
2. Why the event is statistically unusual
3. Whether the evidence suggests a reversal, continuation, or isolated shock
4. What changed after the event
5. A concise analyst-style insight

Important:
- Use only the supplied evidence.
- Do not invent news or causes.
- Clearly distinguish statistical evidence from speculation.
"""


def generate_insight(evidence):

    prompt = build_prompt(evidence)

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    }

    headers = {
        "x-goog-api-key": API_KEY,
        "Content-Type": "application/json"
    }

    response = requests.post(
        URL,
        headers=headers,
        json=payload,
        timeout=60
    )

    if response.status_code != 200:

        raise RuntimeError(
            f"Gemini API error {response.status_code}: "
            f"{response.text}"
        )

    data = response.json()

    return data["candidates"][0]["content"]["parts"][0]["text"]