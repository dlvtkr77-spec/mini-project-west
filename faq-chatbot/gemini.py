import json
import os
import urllib.request
import urllib.error


def ask_gemini(prompt):
    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY가 설정되지 않았습니다.")

  model = "gemini-3.5-flash-lite"

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))

        return result["candidates"][0]["content"]["parts"][0]["text"]

    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8")
        raise RuntimeError(f"Gemini API 오류: {detail}") from e