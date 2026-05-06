from fastapi import APIRouter
from services.ai_client import ai_client
from services.persona_builder import PersonaSeed

advisor = APIRouter()

GUIDED_BUBBLES = {
    "start": [
        "最近有没有哪条内容效果特别好或特别差？",
        "你现在发内容最大的困惑是什么？",
        "你最近一周发了几条？感觉怎么样？",
        "你觉得粉丝最喜欢你哪类内容？",
    ],
    "after_problem": [
        "这个问题大概持续多久了？",
        "你试过哪些方法？效果如何？",
        "你觉得根本原因是什么？",
    ],
    "after_insight": [
        "基于这个方向，你想先做哪个选题？",
        "要不要看看这个方向的蓝海机会分析？",
        "你希望我帮你生成内容框架，还是直接写草稿？",
    ],
}


@advisor.post("/chat")
async def advisor_chat(data: dict):
    message = data.get("message", "")
    history = data.get("conversation_history", [])
    persona_data = data.get("persona", {})

    # Reconstruct PersonaSeed from dict
    try:
        seed = PersonaSeed(**persona_data) if persona_data else None
    except Exception:
        seed = None

    persona_ctx = seed.to_prompt_context() if seed else "（人设未加载）"
    trust_score = seed.trust_score if seed else 72
    growth_stage = seed.growth_stage if seed else "plateau"

    history_text = ""
    if history:
        history_text = "\n".join([
            f"{'用户' if h['role'] == 'user' else 'AI顾问'}：{h['content']}"
            for h in history[-8:]
        ])

    system = f"""你是一位专业的KOC内容成长顾问，名字叫"小助"。
你深度理解社交媒体内容运营，善于通过对话帮助创作者梳理问题、找到方向。

【当前用户人设档案】
{persona_ctx}
信任健康度：{trust_score}/100
当前成长阶段：{growth_stage}

【近期平台趋势背景】
- 平台算法越来越偏向高互动率内容（评论>点赞>收藏）
- 常青内容的长期搜索流量价值持续上升
- 过度商业化账号受众信任度下滑明显
- 差异化切角是突破同质化竞争的核心路径

【对话历史】
{history_text if history_text else "（对话刚开始）"}

你的对话原则（极其重要）：
1. 【倾听优先】用户有想法时，先充分理解，不急着给建议，用追问帮用户说清楚
2. 【一次一问】每次回复最多问一个问题，不要连续问多个
3. 【共情先行】用户描述困境时，先表达理解再分析
4. 【具体不泛】建议必须具体可执行，不说"多发内容"这种废话
5. 【结合人设】所有建议都要基于用户的具体人设，不要通用建议
6. 【引导行动】在对话推进到策略共识后，自然引导用户进入具体行动
7. 【语气风格】像懂行的朋友一样自然，不要像AI客服，可以有自己的判断

输出JSON格式（只输出JSON，不要有其他文字）：
{{
  "reply": "你的回复内容（口语化，有温度，不超过150字）",
  "reply_type": "question或insight或suggestion或action_guide",
  "suggested_action": {{
    "has_action": false,
    "action_type": "go_topic_map或go_create或none",
    "action_label": "按钮文字（如有）",
    "prefill_topic": "如果引导去创作，预填的选题（如有，否则填空字符串）"
  }},
  "next_bubbles": ["引导气泡1", "引导气泡2", "引导气泡3"]
}}"""

    user_msg = message if message else "（用户开启了对话）"
    result = await ai_client.chat(system, user_msg, json_mode=True)

    if result.get("fallback"):
        return {
            "reply": "你好！我是你的内容成长顾问小助。最近内容运营有什么困惑吗？",
            "reply_type": "question",
            "suggested_action": {"has_action": False, "action_type": "none", "action_label": "", "prefill_topic": ""},
            "next_bubbles": GUIDED_BUBBLES["start"][:3],
        }

    if not result.get("next_bubbles"):
        result["next_bubbles"] = GUIDED_BUBBLES["start"][:3]

    return result


@advisor.get("/start-bubbles")
async def get_start_bubbles():
    return {"bubbles": GUIDED_BUBBLES["start"]}
