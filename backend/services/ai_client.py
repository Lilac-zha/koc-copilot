import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()


class AIClient:
    def __init__(self):
        api_key = os.getenv("DEEPSEEK_API_KEY", "")
        base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = "deepseek-chat"
        key_status = "已配置 [OK]" if api_key and api_key != "your_api_key_here" else "未配置 [MISSING]"
        print(f"[AI] Provider: {os.getenv('AI_PROVIDER', 'deepseek')}, Key: {key_status}, Model: {self.model}")

    async def chat(
        self,
        system_prompt: str,
        user_message: str,
        json_mode: bool = True,
        temperature: float = 0.7,
    ) -> dict:
        try:
            kwargs = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "temperature": temperature,
                "max_tokens": 2000,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            response = await self._client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content

            if json_mode:
                return json.loads(content)
            return {"text": content}

        except Exception as e:
            print(f"[AI ERROR] {type(e).__name__}: {e}")
            return {"error": str(e), "fallback": True}


ai_client = AIClient()
