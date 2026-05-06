import json
from services.ai_client import ai_client
from services.persona_builder import PersonaSeed

MOCK_DIR = __import__("pathlib").Path(__file__).parent.parent / "data" / "mock"


async def get_brand_matches(persona: PersonaSeed) -> dict:
    """AI动态生成品牌品类匹配（不推荐具体品牌，推荐品类方向）"""
    remaining = max(0.0, 0.20 - persona.commercial_ratio)

    system = """你是KOC商业变现顾问。
根据KOC的人设档案，推荐最适合的品牌合作品类方向。
注意：不要推荐具体品牌名称，推荐品类和合作方向。
必须基于人设做个性化推荐，每个品类都要说明具体匹配理由。
输出合法JSON，不要有多余文字。"""

    user = f"""创作者人设档案：
{persona.to_prompt_context()}

请推荐3个最适合的品牌合作品类，以及1个不建议品类。
输出JSON：
{{
  "commercial_capacity": {{
    "current_ratio": {persona.commercial_ratio:.2f},
    "max_ratio": 0.20,
    "remaining_space": {remaining:.2f},
    "advice": "当前商业容量建议（一句话）"
  }},
  "recommended_categories": [
    {{
      "id": "cat_001",
      "category": "品类名称（如：效率工具/护肤美妆/健康食品/宠物用品）",
      "description": "该品类典型合作方向描述（一句话）",
      "why_fits": "为什么适合你的人设（具体结合垂类和受众说明，不少于30字）",
      "trust_impact": "low",
      "trust_advice": "如何在合作中保护信任资产（具体建议）",
      "budget_range": "参考预算区间（如：500-2000元/篇）",
      "collaboration_style": "建议的合作内容形式（如：真实测评/日常使用/场景植入）",
      "match_dimensions": {{
        "audience_overlap": 数字0-100,
        "content_fit": 数字0-100,
        "style_match": 数字0-100,
        "trust_safety": 数字0-100
      }},
      "match_tags": ["匹配标签1（具体）", "匹配标签2"],
      "ai_persona_note": "AI人设适配分析（一句话，具体说明与人设的关联）",
      "contact_status": "可接触或可考虑或建议等待"
    }},
    {{ ... 第二个品类 ... }},
    {{ ... 第三个品类 ... }}
  ],
  "not_recommended": [
    {{
      "category": "不建议的品类名称",
      "reason": "与你的人设或信任资产不匹配的具体原因"
    }}
  ]
}}"""

    print(f"[AI] Calling get_brand_matches for niche={persona.niche}, trust={persona.trust_score}")
    result = await ai_client.chat(system, user, json_mode=True)

    if result.get("fallback"):
        print(f"[AI] get_brand_matches fallback. Error: {result.get('error')}")
        return _mock_brand_matches(persona)

    # Compute overall match score from dimensions
    for cat in result.get("recommended_categories", []):
        dims = cat.get("match_dimensions", {})
        cat["match_score"] = round(
            (dims.get("audience_overlap", 50) * 0.3 +
             dims.get("content_fit", 50) * 0.3 +
             dims.get("style_match", 50) * 0.2 +
             dims.get("trust_safety", 50) * 0.2)
        )

    recommendation = _get_recommendation(persona)
    return {
        "categories": result.get("recommended_categories", []),
        "not_recommended": result.get("not_recommended", []),
        "commercial_capacity": result.get("commercial_capacity", {}),
        "recommendation": recommendation,
        "persona_trust_score": persona.trust_score,
    }


def _get_recommendation(persona: PersonaSeed) -> str:
    if persona.trust_score < 60:
        return "当前信任健康度偏低，建议先提升内容质量和互动率，再考虑商业合作"
    if persona.commercial_ratio > 0.2:
        return "商业内容已超警戒线，本月不建议新增商业合作"
    remaining = max(0, 20 - int(persona.commercial_ratio * 100))
    return f"账号状态良好，本月还有 {remaining}% 的商业内容空间"


def _mock_brand_matches(persona: PersonaSeed) -> dict:
    niche = persona.niche
    niche_map = {
        "职场": [
            {"id": "cat_001", "category": "效率工具与SaaS软件", "description": "笔记软件、AI工具、学习平台", "why_fits": f"你的{niche}垂类受众高度重合，职场人士是此类产品的核心用户群", "trust_impact": "low", "trust_advice": "以真实使用场景植入，避免硬广话术", "budget_range": "500-2000元/篇", "collaboration_style": "真实测评+日常场景植入", "match_dimensions": {"audience_overlap": 82, "content_fit": 78, "style_match": 75, "trust_safety": 85}, "match_tags": ["垂类高度匹配", "受众精准重合", "调性相符"], "ai_persona_note": f"你的实用主义风格与效率工具品类天然契合，不会显得突兀", "contact_status": "可接触"},
            {"id": "cat_002", "category": "职业成长与学习课程", "description": "职业技能课程、读书会、学习类APP", "why_fits": "与你的内容价值观高度一致，读者接受度高，不会感觉被推销", "trust_impact": "low", "trust_advice": "分享真实学习感受，不做夸大宣传", "budget_range": "300-1500元/篇", "collaboration_style": "学习体验分享", "match_dimensions": {"audience_overlap": 75, "content_fit": 82, "style_match": 80, "trust_safety": 88}, "match_tags": ["价值观高度一致", "受众完全重合", "信任风险极低"], "ai_persona_note": "职业成长课程与你的内容方向高度统一，读者不会感受到商业推广的违和感", "contact_status": "可接触"},
            {"id": "cat_003", "category": "办公健康与人体工学", "description": "人体工学椅、台灯、护眼产品", "why_fits": f"职场人长期久坐的健康需求与你的受众痛点高度吻合，自然融入{niche}内容", "trust_impact": "low", "trust_advice": "结合自己的真实使用体验，展示对受众健康的关注", "budget_range": "800-3000元/篇", "collaboration_style": "办公场景植入+健康话题引申", "match_dimensions": {"audience_overlap": 68, "content_fit": 65, "style_match": 70, "trust_safety": 80}, "match_tags": ["场景融合自然", "需求痛点匹配"], "ai_persona_note": "健康办公话题与职场内容可自然联动，是低信任风险的优质合作方向", "contact_status": "可考虑"},
        ],
        "宠物": [
            {"id": "cat_001", "category": "宠物食品与营养补充", "description": "宠物主粮、零食、营养补剂", "why_fits": f"你的{niche}垂类受众是核心购买群体，推荐可信度高", "trust_impact": "low", "trust_advice": "分享实际喂养体验，包含宠物真实反应", "budget_range": "300-1500元/篇", "collaboration_style": "宠物实测+喂养日常记录", "match_dimensions": {"audience_overlap": 90, "content_fit": 85, "style_match": 82, "trust_safety": 88}, "match_tags": ["垂类精准匹配", "受众高度重合", "自然融入"], "ai_persona_note": "宠物食品是你内容中最自然的商业延伸，读者有强烈的需求和信任基础", "contact_status": "可接触"},
            {"id": "cat_002", "category": "宠物健康与医疗", "description": "宠物体检套餐、驱虫药、健康监测设备", "why_fits": "宠物健康是铲屎官最关心的话题，通过真实经历分享可以高度触达", "trust_impact": "low", "trust_advice": "以宠物健康关怀角度切入，避免过度推销感", "budget_range": "500-2000元/篇", "collaboration_style": "健康经历分享+产品推荐", "match_dimensions": {"audience_overlap": 80, "content_fit": 78, "style_match": 75, "trust_safety": 85}, "match_tags": ["受众需求精准", "信任安全"], "ai_persona_note": "健康类宠物内容与你真实记录的创作风格高度吻合，容易获得读者认同", "contact_status": "可接触"},
            {"id": "cat_003", "category": "宠物用品与智能设备", "description": "宠物玩具、智能喂食器、宠物摄像头", "why_fits": "生活场景类宠物用品融入日常vlog内容最自然，读者接受度高", "trust_impact": "low", "trust_advice": "在日常记录中自然展示使用场景，展现真实效果", "budget_range": "500-2500元/篇", "collaboration_style": "日常使用场景植入", "match_dimensions": {"audience_overlap": 85, "content_fit": 80, "style_match": 78, "trust_safety": 82}, "match_tags": ["场景植入自然", "受众完全重合"], "ai_persona_note": "宠物用品随手拍进日常记录是最不违和的商业形式，契合你真实分享的内容风格", "contact_status": "可接触"},
        ],
    }

    # Match by niche keyword
    categories = None
    for key in niche_map:
        if key in niche:
            categories = niche_map[key]
            break

    if not categories:
        categories = niche_map["职场"]

    for cat in categories:
        dims = cat.get("match_dimensions", {})
        cat["match_score"] = round(
            dims.get("audience_overlap", 50) * 0.3 +
            dims.get("content_fit", 50) * 0.3 +
            dims.get("style_match", 50) * 0.2 +
            dims.get("trust_safety", 50) * 0.2
        )

    return {
        "categories": categories,
        "not_recommended": [{"category": "奢侈品与高端消费", "reason": f"与你的「真实接地气」人设和{niche}受众的消费能力存在明显落差，信任风险高"}],
        "commercial_capacity": {
            "current_ratio": persona.commercial_ratio,
            "remaining_space": max(0.0, 0.20 - persona.commercial_ratio),
            "advice": _get_recommendation(persona),
        },
        "recommendation": _get_recommendation(persona),
        "persona_trust_score": persona.trust_score,
    }
