import json
import os
from pathlib import Path
from pydantic import BaseModel
from services.ai_client import ai_client

MOCK_DIR = Path(__file__).parent.parent / "data" / "mock"


class PersonaSeed(BaseModel):
    user_id: str
    version: int = 1
    niche: str
    tone: str
    values: list[str]
    target_audience: str
    content_strengths: list[str]
    language_patterns: list[str]
    platform: str
    growth_stage: str  # growth / plateau / declining
    trust_score: float = 80.0
    commercial_ratio: float = 0.05
    evergreen_ratio: float = 0.58
    follower_count: int = 8600
    avg_engagement_rate: float = 0.042
    analysis_summary: str = ""

    def to_prompt_context(self) -> str:
        stage_label = {"growth": "成长期", "plateau": "停滞期", "declining": "下滑期"}.get(self.growth_stage, self.growth_stage)
        return (
            f"垂类：{self.niche}\n"
            f"语言风格：{self.tone}\n"
            f"核心价值观：{', '.join(self.values)}\n"
            f"目标受众：{self.target_audience}\n"
            f"内容优势：{', '.join(self.content_strengths)}\n"
            f"语言特点：{', '.join(self.language_patterns)}\n"
            f"平台：{self.platform}\n"
            f"成长阶段：{stage_label}\n"
            f"信任健康度：{self.trust_score}/100\n"
            f"商业内容占比：{self.commercial_ratio:.0%}\n"
            f"常青内容占比：{self.evergreen_ratio:.0%}\n"
            f"粉丝量：{self.follower_count:,}\n"
            f"互动率：{self.avg_engagement_rate:.1%}"
        )


async def build_from_content(user_id: str, content_samples: list[str], platform: str) -> PersonaSeed:
    """AC路径：从历史内容逆向提炼人设"""
    system_prompt = """你是一个专业的KOC内容分析师。分析用户提供的历史内容样本，逆向提炼出该用户的内容人设。
严格按照JSON格式输出，包含以下字段：
{
  "niche": "内容垂类（一句话描述，如：职场效率与个人成长）",
  "tone": "语言风格（形容词组合，如：真实接地气、温暖幽默）",
  "values": ["价值观标签1", "价值观标签2", "价值观标签3"],
  "target_audience": "目标受众描述（如：25-35岁职场新人，关注成长与效率）",
  "content_strengths": ["内容优势1", "内容优势2", "内容优势3"],
  "language_patterns": ["语言模式1", "语言模式2"],
  "growth_stage": "plateau",
  "analysis_summary": "一段话总结AI眼中的这个创作者（50字左右）"
}"""

    user_message = f"平台：{platform}\n\n历史内容样本：\n" + "\n---\n".join(content_samples[:5])

    print(f"[AI] Calling build_from_content for user={user_id}")
    result = await ai_client.chat(system_prompt, user_message, json_mode=True)

    if result.get("fallback"):
        print(f"[AI] build_from_content fallback to mock. Error: {result.get('error')}")
        return _load_mock_persona(user_id)

    print(f"[AI] build_from_content success: niche={result.get('niche')}")
    return PersonaSeed(
        user_id=user_id,
        version=1,
        platform=platform,
        niche=result.get("niche", "内容创作"),
        tone=result.get("tone", "真实接地气"),
        values=result.get("values", ["真实", "成长", "价值"]),
        target_audience=result.get("target_audience", "普通内容创作者"),
        content_strengths=result.get("content_strengths", ["内容真实", "选题精准"]),
        language_patterns=result.get("language_patterns", ["亲切对话式", "故事化叙述"]),
        growth_stage=result.get("growth_stage", "plateau"),
        analysis_summary=result.get("analysis_summary", ""),
        # 给新建人设一组合理的初始数据
        trust_score=72.5,
        commercial_ratio=0.05,
        evergreen_ratio=0.58,
        follower_count=8600,
        avg_engagement_rate=0.042,
    )


def _derive_stats_from_answers(answers: dict) -> dict:
    """从问卷答案推算账号真实数据（兼容新旧问卷格式）"""
    # 新版问卷粉丝档
    follower_map_new = {
        "0": 0, "100-500": 300, "500-2000": 1000,
        "2000-5000": 3500, "5000-20000": 10000, "20000以上": 28000,
    }
    # 旧版问卷粉丝档
    follower_map_old = {
        "还没开始": 0, "1千以下": 500, "1千-5千": 3000,
        "5千-1万": 7500, "1万-2万": 15000, "2万以上": 28000,
    }
    follower_label = answers.get("粉丝量级", answers.get("Q5_followers", "1千-5千"))
    follower_count = follower_map_new.get(follower_label) or follower_map_old.get(follower_label, 3000)

    # 兼容新旧版本的痛点字段
    pain_points = answers.get("最大困扰", answers.get("想解决的问题", ""))
    has_traffic_issue = any(k in pain_points for k in ["互动率", "没什么评论", "没流量"])
    has_monetize_issue = any(k in pain_points for k in ["接广告", "接商单", "品牌合作"])
    has_growth_issue = any(k in pain_points for k in ["涨粉", "粉丝"])

    # 根据粉丝量和痛点判断成长阶段
    if follower_count < 1000:
        growth_stage = "growth"
        trust_score = 78.0
        evergreen_ratio = 0.65
        commercial_ratio = 0.02
        avg_engagement_rate = 0.058
    elif follower_count < 10000:
        growth_stage = "plateau" if (has_traffic_issue or has_growth_issue) else "growth"
        trust_score = 65.0 if has_traffic_issue else 72.5
        evergreen_ratio = 0.50 if has_traffic_issue else 0.60
        commercial_ratio = 0.18 if has_monetize_issue else 0.08
        avg_engagement_rate = 0.032 if has_traffic_issue else 0.043
    else:
        growth_stage = "declining" if has_traffic_issue else "plateau"
        trust_score = 58.0 if has_traffic_issue else 68.0
        evergreen_ratio = 0.45 if has_traffic_issue else 0.55
        commercial_ratio = 0.22 if has_monetize_issue else 0.12
        avg_engagement_rate = 0.025 if has_traffic_issue else 0.038

    return {
        "follower_count": follower_count,
        "growth_stage": growth_stage,
        "trust_score": trust_score,
        "evergreen_ratio": evergreen_ratio,
        "commercial_ratio": commercial_ratio,
        "avg_engagement_rate": avg_engagement_rate,
    }


async def build_from_questionnaire(user_id: str, answers: dict, platform: str) -> PersonaSeed:
    """B路径：从问卷正向构建人设"""
    stats = _derive_stats_from_answers(answers)

    system_prompt = f"""你是一个专业的内容策略师。根据用户的问卷回答，构建其内容人设档案。
严格按照JSON格式输出（只输出JSON，不要有其他文字）：
{{
  "niche": "内容垂类（结合用户回答提炼，如：职场效率与个人成长）",
  "tone": "语言风格（结合用户选择，如：幽默轻松、真实接地气）",
  "values": ["核心价值观1", "核心价值观2", "核心价值观3"],
  "target_audience": "目标受众（结合用户描述具体化）",
  "content_strengths": ["内容优势1", "内容优势2", "内容优势3"],
  "language_patterns": ["语言模式1", "语言模式2"],
  "analysis_summary": "基于你的回答，AI眼中的你是…（50字，第一人称描述这个创作者）"
}}
注意：成长阶段已确定为 {stats['growth_stage']}，不需要输出该字段。"""

    answers_text = "\n".join([f"Q: {k}\nA: {v}" for k, v in answers.items()])
    user_message = f"平台：{platform}\n\n问卷回答：\n{answers_text}"

    print(f"[AI] Calling build_from_questionnaire for user={user_id}, follower={stats['follower_count']}, stage={stats['growth_stage']}")
    result = await ai_client.chat(system_prompt, user_message, json_mode=True)

    if result.get("fallback"):
        print(f"[AI] build_from_questionnaire fallback to mock. Error: {result.get('error')}")
        mock = _load_mock_persona(user_id)
        # Still apply dynamic stats even in fallback
        for k, v in stats.items():
            setattr(mock, k, v)
        return mock

    print(f"[AI] build_from_questionnaire success: niche={result.get('niche')}")
    return PersonaSeed(
        user_id=user_id,
        version=1,
        platform=platform,
        niche=result.get("niche", "内容创作"),
        tone=result.get("tone", "真实接地气"),
        values=result.get("values", ["真实", "成长", "价值"]),
        target_audience=result.get("target_audience", "普通内容创作者"),
        content_strengths=result.get("content_strengths", ["内容真实", "选题精准"]),
        language_patterns=result.get("language_patterns", ["亲切对话式", "故事化叙述"]),
        analysis_summary=result.get("analysis_summary", ""),
        **stats,
    )


def check_persona_consistency(persona: PersonaSeed, content_topic: str) -> dict:
    """人设一致性守卫：检查内容选题是否偏离人设"""
    risk_score = 0
    warnings = []

    if persona.commercial_ratio > 0.2:
        risk_score += 30
        warnings.append("商业内容占比过高，本篇建议纯价值内容")

    if persona.commercial_ratio > 0.4:
        risk_score += 30
        warnings.append("严重预警：商业内容过度，信任资产快速折旧中")

    return {
        "is_consistent": risk_score < 40,
        "risk_score": risk_score,
        "warnings": warnings,
    }


def _load_mock_persona(user_id: str) -> PersonaSeed:
    # MOCK - 替换为真实数据源
    with open(MOCK_DIR / "persona_seed.json", encoding="utf-8") as f:
        data = json.load(f)
    data["user_id"] = user_id
    return PersonaSeed(**data)
