from __future__ import annotations
import asyncio
import time
import traceback
import httpx


GOOGLE_TRANSLATE_API_URL = "https://translation.googleapis.com/language/translate/v2"


class GoogleTranslator:
    def __init__(self, *, api_key: str | None = None, queue: asyncio.Queue) -> None:
        super().__init__()
        self.api_key = api_key
        if not self.api_key:
            raise ValueError(
                "Google API key must be provided either through api_key parameter or GOOGLE_API_KEY environment variable"
            )

        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=15.0, read=30.0, write=5.0, pool=5.0),
            follow_redirects=True,
        )
        self.publish_queue = queue

    async def translate(self, text, source_language_code, target_language_code) -> str:
        try:
            # Google Translate API request
            url = f"{GOOGLE_TRANSLATE_API_URL}?key={self.api_key}"
            
            payload = {
                "q": text,
                "source": source_language_code,
                "target": target_language_code,
                "format": "text"
            }

            print(f"Translating: {text} from {source_language_code} to {target_language_code}")

            headers = {
                "Content-Type": "application/json",
            }

            response = await self._client.post(url, json=payload, headers=headers)
            response.raise_for_status()

            api_res = response.json()

            print(f"Translation response: {api_res}")

            # Extract translated text from Google API response
            if "data" in api_res and "translations" in api_res["data"]:
                translated_text = api_res["data"]["translations"][0]["translatedText"]
                return translated_text
            else:
                print("error", "No translation found in response")
                return ""

        except httpx.HTTPStatusError as e:
            error_message = f"Google Translate API error: {e.response.status_code}"
            try:
                error_body = await e.response.aread()
                error_text = error_body.decode()
                error_message += f" - {error_text}"
            except Exception:
                pass
            print("error", Exception(error_message))
            raise
        except Exception as e:
            traceback.print_exc()
            print("error", e)
            return ""

    async def aclose(self) -> None:
        if self._client:
            await self._client.aclose()
