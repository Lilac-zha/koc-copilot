import json
from pathlib import Path
from services.persona_builder import PersonaSeed

MOCK_DIR = Path(__file__).parent.parent / "data" / "mock"


def calculate_trust_score(
    base_score: float,
    commercial_ratio: float,
    evergreen_ratio: float,
    avg_engagement_rate: float,
) -> float:
    """计算信任健康度分数"""
    score = base_score

    # 商业内容占比惩罚
    if commercial_ratio > 0.4:
        score -= 25
    elif commercial_ratio > 0.2:
        score -= (commercial_ratio - 0.2) * 50

    # 常青内容奖励
    if evergreen_ratio >= 0.7:
        score += 5
    elif evergreen_ratio < 0.4:
        score -= 10

    # 互动率奖励（健康值 >3%）
    if avg_engagement_rate > 0.05:
        score += 5
    elif avg_engagement_rate < 0.02:
        score -= 5

    return round(max(0, min(100, score)), 1)


def get_trust_level(score: float) -> dict:
    if score >= 80:
        return {"level": "健康", "color": "green", "emoji": ""}
    elif score >= 60:
        return {"level": "注意", "color": "yellow", "emoji": ""}
    elif score >= 40:
        return {"level": "预警", "color": "orange", "emoji": ""}
    else:
        return {"level": "危险", "color": "red", "emoji": ""}


def generate_warnings(persona: PersonaSeed) -> list[dict]:
    warnings = []

    if persona.commercial_ratio > 0.4:
        warnings.append({
            "type": "commercial_critical",
            "level": "red",
            "message": f"商业内容占比{persona.commercial_ratio*100:.0f}%，严重超标！信任资产快速折旧，强烈建议暂停商业合作",
        })
    elif persona.commercial_ratio > 0.2:
        warnings.append({
            "type": "commercial_approaching",
            "level": "yellow",
            "message": f"商业内容占比{persona.commercial_ratio*100:.0f}%，接近或超过20%预警线，建议增加纯价值内容",
        })

    if persona.evergreen_ratio < 0.4:
        warnings.append({
            "type": "evergreen_critical",
            "level": "orange",
            "message": f"常青内容仅占{persona.evergreen_ratio*100:.0f}%，账号长期资产严重不足",
        })
    elif persona.evergreen_ratio < 0.7:
        warnings.append({
            "type": "evergreen_low",
            "level": "yellow",
            "message": f"常青内容占比{persona.evergreen_ratio*100:.0f}%，低于目标70%，建议规划更多常青选题",
        })

    return warnings


def update_flywheel(persona: PersonaSeed, new_data: dict) -> PersonaSeed:
    """数据飞轮：根据新数据更新PersonaSeed版本"""
    updated = persona.model_copy()
    updated.version += 1

    if "avg_engagement_rate" in new_data:
        updated.avg_engagement_rate = new_data["avg_engagement_rate"]
    if "commercial_ratio" in new_data:
        updated.commercial_ratio = new_data["commercial_ratio"]
    if "evergreen_ratio" in new_data:
        updated.evergreen_ratio = new_data["evergreen_ratio"]
    if "follower_count" in new_data:
        updated.follower_count = new_data["follower_count"]

    updated.trust_score = calculate_trust_score(
        updated.trust_score,
        updated.commercial_ratio,
        updated.evergreen_ratio,
        updated.avg_engagement_rate,
    )

    return updated


def get_analytics_dashboard(persona: PersonaSeed) -> dict:
    # MOCK - 替换为真实数据源（接入平台数据回流后替换mock history）
    with open(MOCK_DIR / "analytics.json", encoding="utf-8") as f:
        mock_data = json.load(f)

    trust_info = get_trust_level(persona.trust_score)
    warnings = generate_warnings(persona)

    return {
        **mock_data,
        "trust_score": persona.trust_score,
        "trust_level": trust_info["level"],
        "trust_color": trust_info["color"],
        "commercial_ratio": persona.commercial_ratio,
        "evergreen_ratio": persona.evergreen_ratio,
        "warnings": warnings,
        "persona_version": persona.version,
    }
