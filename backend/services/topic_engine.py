import json
from pathlib import Path
from services.ai_client import ai_client
from services.persona_builder import PersonaSeed, check_persona_consistency
from services.rag_retriever import retrieve_for_content_creation
from services.trend_fetcher import get_trending_topics, get_trend_summary_for_prompt

MOCK_DIR = Path(__file__).parent.parent / "data" / "mock"


def calculate_blue_ocean_score(heat: float, competition: float, trend: str) -> float:
    """蓝海算法核心：蓝海分 = 热度 × (1 - 竞争度) × 成长系数"""
    growth_factor = {"rising": 1.3, "stable": 1.0, "declining": 0.7}.get(trend, 1.0)
    return round(heat * (1 - competition) * growth_factor, 1)


async def get_topic_recommendations(persona: PersonaSeed, count: int = 5) -> dict:
    """基于人设种子生成个性化选题推荐"""
    rag = retrieve_for_content_creation(persona.niche, "", persona.platform, "medium")
    platform_rules = json.dumps(rag.get("platform_rules", {}), ensure_ascii=False)
    niche_insights = json.dumps(rag.get("niche_insights", {}), ensure_ascii=False)
    structures = json.dumps(rag.get("recommended_structures", []), ensure_ascii=False)

    try:
        trend_data = await get_trending_topics(persona.niche)
        trend_summary = get_trend_summary_for_prompt(persona.niche, trend_data.get("weibo", []))
    except Exception:
        trend_summary = ""

    system_prompt = f"""你是一个社媒内容策略专家。基于KOC的人设档案，推荐{count}个差异化选题。

【⚠️ 垂类约束——最高优先级】
该KOC的内容垂类是：{persona.niche}
所有推荐选题必须且只能属于"{persona.niche}"这个垂类。
严禁推荐其他垂类内容，哪怕话题热门也不行。
- 错误示例（数码科技垂类）：推荐"职场晋升技巧"、"护肤步骤分享"
- 正确示例（数码科技垂类）：推荐"iPhone相机拍照技巧"、"最值得买的蓝牙耳机对比"
每个选题的title和category都必须直接体现"{persona.niche}"垂类关键词。

【垂类市场洞察】{niche_insights}
【平台规律】{platform_rules}
【高效内容结构】{structures}
{trend_summary}

必须严格按照以下JSON格式输出：
{{
  "topics": [
    {{
      "id": "topic_001",
      "title": "具体选题标题（必须属于{persona.niche}垂类）",
      "category": "{persona.niche}相关分类",
      "type": "evergreen或timely",
      "heat_score": 0-100的热度值,
      "competition_score": 0-1的竞争度,
      "growth_trend": "rising/stable/declining",
      "differentiation_reason": "为什么推荐给这个KOC的理由，结合其人设特点",
      "content_asset": {{
        "structure_template": "内容结构模板",
        "cover_style": "封面风格建议",
        "bgm_mood": "BGM情绪标签",
        "hashtags": ["标签1", "标签2"],
        "best_publish_time": "最佳发布时间"
      }}
    }}
  ],
  "summary": {{
    "total_blue_ocean": 蓝海选题数量,
    "recommended_mix": "本周内容组合建议"
  }}
}}

要求：
1. 所有选题必须100%属于"{persona.niche}"垂类，这是最优先的约束
2. 至少60%为常青选题
3. heat_score和competition_score要符合实际市场情况
4. differentiation_reason必须具体说明与该KOC人设的关联"""

    user_message = f"KOC人设档案：\n{persona.to_prompt_context()}"

    print(f"[AI] Calling get_topic_recommendations for niche={persona.niche}")
    result = await ai_client.chat(system_prompt, user_message, json_mode=True)

    if result.get("fallback"):
        print(f"[AI] get_topic_recommendations fallback. Error: {result.get('error')}")
        return _load_mock_topics()

    topics = result.get("topics", [])
    for topic in topics:
        topic["blue_ocean_score"] = calculate_blue_ocean_score(
            topic.get("heat_score", 50),
            topic.get("competition_score", 0.5),
            topic.get("growth_trend", "stable"),
        )

    return result


async def generate_content_asset(persona: PersonaSeed, topic: dict, mode: str) -> dict:
    """三档介入模式内容生成 — 各模式完全独立Prompt"""
    topic_title = topic.get("title", "")
    consistency = check_persona_consistency(persona, topic_title)
    persona_ctx = persona.to_prompt_context()

    rag = retrieve_for_content_creation(persona.niche, topic_title, persona.platform, mode)
    platform_rules = json.dumps(rag.get("platform_rules", {}), ensure_ascii=False, indent=2)
    niche_insights = json.dumps(rag.get("niche_insights", {}), ensure_ascii=False, indent=2)
    structures = json.dumps(
        rag.get("recommended_structures", rag.get("all_patterns", [])),
        ensure_ascii=False, indent=2,
    )

    # ── 轻模式：完整可发布草稿 ─────────────────────────────────
    if mode == "light":
        system = f"""你是一个深度理解KOC风格的内容代笔助手。
你的唯一任务是：写出一篇创作者本人发出去没有人觉得是AI写的内容。

【创作者人设】
{persona_ctx}

【平台规则参考】
{platform_rules}

【该垂类内容规律】
{niche_insights}

【高效内容结构参考】
{structures}

写作原则（必须全部遵守）：
1. 完全模仿创作者的语言风格，包括：口头禅、句式习惯、情绪表达方式
2. 有真实的个人视角和情绪，不是泛泛而谈
3. 结构：强钩子(前20字抓住注意力) + 有节奏感的正文 + 引导互动的结尾提问
4. 口语化，允许有语气词、不完整句子
5. 长度适配平台：{persona.platform}（小红书800-1500字）
6. 绝对禁止：AI腔、过度整齐的列举、"总的来说"等套话
7. 结尾必须有一个具体问题引导评论（不是"欢迎留言"这种废话）

输出JSON（字段名称必须完全匹配）：
{{
  "title_options": [
    {{"title": "标题1", "style": "情绪钩子型", "reason": "为什么这个标题能点击"}},
    {{"title": "标题2", "style": "信息差型", "reason": "理由"}},
    {{"title": "标题3", "style": "数字清单型", "reason": "理由"}}
  ],
  "content_blocks": {{
    "hook": "开场钩子（前20-30字，让人立刻想继续看）",
    "body": "正文主体（完整内容，符合平台长度规范，分段用\\n\\n分隔）",
    "ending": "结尾+互动引导（包含一个让人想回答的问题）"
  }},
  "asset_pack": {{
    "cover_style": "封面风格建议（色调+构图+文字风格）",
    "bgm_mood": "配乐情绪标签（如：温暖日常/轻松治愈）",
    "best_publish_time": "最佳发布时间（基于平台规律，如：周日晚21:00-22:00）",
    "tags": ["#话题标签1", "#话题标签2", "#话题标签3", "#话题标签4"],
    "interaction_guide": "发布后1小时内的互动维护建议"
  }},
  "persona_check": {{
    "consistency_score": 88,
    "match_points": ["风格匹配点1", "风格匹配点2"],
    "risk_note": "如有风险点则说明，无则填null"
  }}
}}"""
        user = f"选题：{topic_title}\n平台：{persona.platform}\n请直接生成完整可发布内容。"

    # ── 中模式：结构框架+方向提示 ──────────────────────────────
    elif mode == "medium":
        system = f"""你是KOC的内容策略顾问，不是代笔工具。
你的任务是：给创作者提供精准的创作框架和关键素材，
让创作者能基于这个框架写出最具个人风格的内容。

【创作者人设】
{persona_ctx}

【平台规则参考】
{platform_rules}

【该垂类内容规律与受众心理】
{niche_insights}

【可参考的内容结构模板】
{structures}

输出原则：
1. 给方向和素材，不要替创作者做所有决定
2. 每个建议都要说明"为什么这样做对你有效"
3. 基于该垂类受众心理来设计框架
4. 保留创作者自由发挥的空间

输出JSON（字段名称必须完全匹配）：
{{
  "title_options": [
    {{"title": "标题方向1", "angle": "切入角度说明", "click_reason": "为什么用户会点击"}},
    {{"title": "标题方向2", "angle": "切入角度", "click_reason": "点击原因"}},
    {{"title": "标题方向3", "angle": "切入角度", "click_reason": "点击原因"}}
  ],
  "content_framework": {{
    "recommended_structure": "推荐结构名称（如：错误示范型）",
    "structure_reason": "为什么这个结构适合这个选题和你的人设",
    "opening_options": [
      {{"option": "开场方式1", "emotion": "制造的情绪基调", "example": "示例首句"}},
      {{"option": "开场方式2", "emotion": "情绪基调", "example": "示例首句"}}
    ],
    "key_points": [
      {{"point": "核心论点1", "support_angle": "支撑这个论点的最佳角度", "tip": "创作技巧提示"}},
      {{"point": "核心论点2", "support_angle": "支撑角度", "tip": "创作技巧"}},
      {{"point": "核心论点3", "support_angle": "支撑角度", "tip": "创作技巧"}}
    ],
    "ending_design": [
      {{"option": "结尾方式1", "interaction_question": "引导评论的具体问题"}},
      {{"option": "结尾方式2", "interaction_question": "具体问题"}}
    ]
  }},
  "asset_pack": {{
    "cover_style": "封面风格建议",
    "bgm_mood": "配乐情绪标签",
    "best_publish_time": "最佳发布时间（如：周日晚21:00-22:00）",
    "tags": ["#标签1", "#标签2", "#标签3", "#标签4"],
    "interaction_guide": "发布后互动维护建议"
  }},
  "persona_check": {{
    "consistency_score": 85,
    "match_points": ["匹配点1", "匹配点2"],
    "risk_note": "风险提示或null"
  }}
}}"""
        user = f"选题：{topic_title}\n平台：{persona.platform}\n请提供内容框架和创作指导。"

    # ── 深模式：竞品分析+差异化策略 ───────────────────────────
    else:
        all_patterns = json.dumps(rag.get("all_patterns", []), ensure_ascii=False, indent=2)
        system = f"""你是一名资深内容市场分析师，专注于社交媒体内容竞争差异化研究。
你的任务是：对该选题进行深度市场分析，帮助KOC找到别人都在做但没做好的内容盲区。

【创作者人设档案】
{persona_ctx}

【该垂类市场洞察与受众心理数据】
{niche_insights}

【平台算法规则】
{platform_rules}

【现有内容结构模式库（用于分析同质化）】
{all_patterns}

分析框架要求：
1. 市场现状要基于真实内容规律，不要泛泛而谈
2. 差异化角度必须结合创作者人设，不是通用建议
3. 受众心理分析要触及深层动机（不只是表面需求）
4. 爆款概率判断要有逻辑依据
5. 每个角度必须有具体的开场示例句，不是抽象描述
6. 明确指出人设风险（哪个角度可能与人设冲突）

输出JSON（字段名称必须完全匹配）：
{{
  "market_analysis": {{
    "mainstream_content": [
      "当前市场主流内容特征1（具体描述，不要泛泛而谈）",
      "特征2",
      "特征3"
    ],
    "homogenization_problem": "这些特征导致的同质化问题分析（100字以内，要具体）",
    "audience_real_need": {{
      "surface_need": "用户搜索这个话题的表面原因",
      "deep_need": "用户真正想解决的深层问题",
      "emotional_need": "情绪层面的诉求",
      "psychology_insight": "受众心理洞察，为差异化提供依据"
    }}
  }},
  "differentiation_angles": [
    {{
      "rank": 1,
      "angle_name": "差异化角度名称",
      "core_idea": "切入视角一句话描述",
      "why_different": "为什么这个角度有竞争差异（结合市场现状，具体说明）",
      "why_fits_persona": "为什么适合这个创作者的人设（具体说明）",
      "opening_example": "具体的开场第一句话示例（可以直接用的那种）",
      "content_structure": "推荐的内容结构（如：错误示范型/成长复盘型）",
      "viral_potential": "high",
      "viral_reason": "爆款概率判断依据（具体分析）",
      "risk": "潜在风险（与人设冲突点或执行难度）",
      "best_format": "最适合的内容形式（如：图文9张/60秒视频）"
    }},
    {{
      "rank": 2,
      "angle_name": "差异化角度名称2",
      "core_idea": "切入视角",
      "why_different": "竞争差异分析",
      "why_fits_persona": "与人设匹配说明",
      "opening_example": "具体开场示例句",
      "content_structure": "内容结构",
      "viral_potential": "medium",
      "viral_reason": "爆款概率依据",
      "risk": "风险",
      "best_format": "内容形式"
    }},
    {{
      "rank": 3,
      "angle_name": "差异化角度名称3",
      "core_idea": "切入视角",
      "why_different": "竞争差异分析",
      "why_fits_persona": "与人设匹配说明",
      "opening_example": "具体开场示例句",
      "content_structure": "内容结构",
      "viral_potential": "stable",
      "viral_reason": "爆款概率依据",
      "risk": "风险",
      "best_format": "内容形式"
    }}
  ],
  "recommended_angle": {{
    "choice": 1,
    "reason": "综合人设匹配度和市场机会，为什么选择角度1",
    "execution_tip": "执行这个角度时最重要的3个注意事项（具体）"
  }},
  "asset_pack": {{
    "cover_style": "基于推荐角度的封面风格建议",
    "bgm_mood": "配乐情绪标签",
    "best_publish_time": "最佳发布时间",
    "tags": ["#标签1", "#标签2", "#标签3", "#标签4"],
    "interaction_guide": "基于该角度设计的互动引导策略"
  }}
}}"""
        user = f"选题：{topic_title}\n平台：{persona.platform}\n请进行深度市场分析，找出差异化切角。"

    print(f"[AI] Calling generate_content_asset: topic={topic_title[:30]}, mode={mode}")
    result = await ai_client.chat(system, user, json_mode=True)

    if result.get("fallback"):
        print(f"[AI] generate_content_asset fallback. Error: {result.get('error')}")
        return _mock_content_asset(topic, mode, persona)

    result["mode"] = mode
    result["topic"] = topic_title
    result["consistency_check"] = consistency
    return result


def _load_mock_topics() -> dict:
    with open(MOCK_DIR / "topics.json", encoding="utf-8") as f:
        data = json.load(f)
    for topic in data.get("topics", []):
        topic["blue_ocean_score"] = calculate_blue_ocean_score(
            topic["heat_score"], topic["competition_score"], topic["growth_trend"]
        )
    return data


def _mock_content_asset(topic: dict, mode: str, persona: PersonaSeed = None) -> dict:
    title = topic.get("title", "选题")
    niche = persona.niche if persona else "职场成长"

    asset_pack = {
        "cover_style": "人物+文字，温暖色调，制造悬念感",
        "bgm_mood": "轻音乐，温暖治愈",
        "best_publish_time": "周日晚 21:00-22:00",
        "tags": [f"#{niche}", "#个人成长", "#干货分享", "#真实经历"],
        "interaction_guide": "发布后30分钟内主动回复前10条评论，提升互动权重",
    }
    persona_check = {
        "consistency_score": 87,
        "match_points": [f"风格匹配：语气与{niche}人设一致", "垂类相关：内容聚焦核心赛道"],
        "risk_note": None,
    }

    if mode == "light":
        return {
            "mode": "light", "topic": title,
            "title_options": [
                {"title": title, "style": "情绪钩子型", "reason": "直击目标受众痛点，点击欲强"},
                {"title": f"{title}（亲测有效）", "style": "信任背书型", "reason": "真实感增强信任，降低用户疑虑"},
                {"title": f"为什么{title[:8]}？3个你没想到的原因", "style": "疑问悬念型", "reason": "制造知识缺口，驱动点击"},
            ],
            "content_blocks": {
                "hook": f"你有没有发现，身边总有那么几个人——明明和你差不多努力，却总是比你先想明白？\n\n我在这件事上卡了很久，直到最近才真正搞清楚为什么。",
                "body": f"第一个点：很多人忽视了这个维度\n做好基本功只是基础，真正的差距在于你有没有让正确的人看到你在做什么。\n\n第二个点：方法比努力更重要\n不是汇报频率，而是结论先行+数据支撑的沟通框架，才是真正的加分项。\n\n第三个点：主动跨越边界\n只有主动承接边界外的任务，才能被看到成长潜力，这是大多数人不愿意做的事。",
                "ending": f"如果你也在{niche}上卡了很久，试试从这三个维度重新审视自己。\n\n评论区告诉我：哪个维度你觉得最难突破？我来一起想方案👇",
            },
            "asset_pack": asset_pack,
            "persona_check": persona_check,
        }

    elif mode == "medium":
        return {
            "mode": "medium", "topic": title,
            "title_options": [
                {"title": title, "angle": "直接命题", "click_reason": "标题即答案，目标受众精准触达"},
                {"title": f"入{niche}圈X年，我踩过的3个大坑", "angle": "避坑叙事", "click_reason": "负面共鸣强，收藏动机高"},
                {"title": f"为什么我的{niche}内容突然开始有人看？", "angle": "悬念引导", "click_reason": "制造好奇，驱动点击"},
            ],
            "content_framework": {
                "recommended_structure": "成长复盘型",
                "structure_reason": f"该结构天然适配你的「真实分享」人设，{niche}受众对真实经历的信任度远高于方法论说教",
                "opening_options": [
                    {"option": "自我暴露式开场", "emotion": "脆弱共鸣", "example": f"说实话，我{niche[:2]}了X年才明白这件事，早点知道能少走多少弯路..."},
                    {"option": "情境代入式开场", "emotion": "场景共鸣", "example": "上周有个粉丝私信我，说她遇到了一个让她非常崩溃的情况..."},
                ],
                "key_points": [
                    {"point": "核心认知差距", "support_angle": "大多数人做X，但真正有效的是Y", "tip": "用对比结构放大认知冲击"},
                    {"point": "可操作的方法", "support_angle": "结合你的亲身经验说具体步骤", "tip": "每个步骤给一个最小可执行动作"},
                    {"point": "真实案例佐证", "support_angle": "你自己或身边人的真实案例", "tip": "细节越真实，信任度越高"},
                ],
                "ending_design": [
                    {"option": "问题引导型", "interaction_question": f"你在{niche}上遇到过类似情况吗？当时你是怎么应对的？"},
                    {"option": "选择题型", "interaction_question": "以上三点，你觉得哪个对你来说最难做到？A B 还是 C？"},
                ],
            },
            "asset_pack": asset_pack,
            "persona_check": persona_check,
        }

    else:  # deep
        return {
            "mode": "deep", "topic": title,
            "market_analysis": {
                "mainstream_content": [
                    f"大量{niche}内容以「方法论清单」为主，缺乏个人真实场景",
                    "标题同质化严重，大量使用「X个技巧」「必看」等高度重复的钩子词",
                    "内容停留在表面问题，未触及用户深层焦虑和核心诉求",
                ],
                "homogenization_problem": f"当前{niche}赛道内容已形成固定套路：开场痛点→清单方法→结尾收藏。读者已对这种结构产生「预期疲劳」，实际上他们更渴望看到有血有肉的真实经历和有观点的分析视角。",
                "audience_real_need": {
                    "surface_need": f"搜索{niche}相关内容，想获取方法或好物推荐",
                    "deep_need": "想找到一个真正理解自己处境的声音，获得认同和可行出路",
                    "emotional_need": "焦虑中需要安慰感，同时不愿意被「鸡汤」敷衍",
                    "psychology_insight": "用户不缺信息，缺的是「和我一样的人是怎么过来的」这种真实感和可借鉴性",
                },
            },
            "differentiation_angles": [
                {
                    "rank": 1,
                    "angle_name": "失败经历反向切入",
                    "core_idea": "从自己真实踩过的坑切入，而非展示成功结果",
                    "why_different": "市场主流内容都在展示「我成功了」，而用户更能共情「我也失败过」的视角，信任度和收藏率都更高",
                    "why_fits_persona": f"你的「{persona.tone if persona else '真实接地气'}」人设天然适合这类自我暴露型内容，不会显得虚假",
                    "opening_example": f"老实说，我{niche[:3]}这么久，有一段时间真的做得很差，差到我都开始怀疑自己是不是根本不适合...",
                    "content_structure": "错误示范型",
                    "viral_potential": "high",
                    "viral_reason": "负面共鸣比正面励志更强，完播率和评论率显著更高，适合当前平台算法偏好",
                    "risk": "需要真实自我暴露，执行难度在于勇气而非技巧；过度卖惨需把握尺度",
                    "best_format": "图文9张或60-90秒竖视频",
                },
                {
                    "rank": 2,
                    "angle_name": "观察者视角",
                    "core_idea": "观察身边人，分析对比差距，输出结构化洞察",
                    "why_different": "大多数内容是「我的经历」，观察他人的视角提供了更广的信息维度，显得更客观可信",
                    "why_fits_persona": f"你的{niche}垂类积累让你有足够的观察素材，内容优势中的「干货提炼能力」正好适合此结构",
                    "opening_example": "我观察了身边十几个在同一起点出发的人，5年后差距大得令我震惊。仔细拆解之后，我发现了3个关键分叉点...",
                    "content_structure": "对比反转型",
                    "viral_potential": "medium",
                    "viral_reason": "对比叙事在信息流中抓眼球能力强，且提供了「可评论的结论」，易引发讨论",
                    "risk": "需要足够的观察案例支撑，信息量不足时容易显得单薄",
                    "best_format": "图文6-9张，配真实场景感照片",
                },
                {
                    "rank": 3,
                    "angle_name": "反常识切角",
                    "core_idea": "提出一个与主流认知相反的观点并用亲身经历验证",
                    "why_different": "在同质化内容海洋中，反直觉观点天然具有点击诱惑力，能穿透信息噪音",
                    "why_fits_persona": f"你的「实用主义」价值观让你有信心质疑主流方法，这与你的人设非常契合",
                    "opening_example": f"所有人都告诉我要做X，我偏偏反其道而行之，结果却出乎意料地成功了...",
                    "content_structure": "对比反转型",
                    "viral_potential": "stable",
                    "viral_reason": "反常识内容分享率高，但需要有足够的论据支撑，执行难度较高",
                    "risk": "观点必须有充分支撑，否则易引发争议；需要确保与你的专业定位匹配",
                    "best_format": "图文或3-5分钟中视频，需要充分论证空间",
                },
            ],
            "recommended_angle": {
                "choice": 1,
                "reason": f"失败经历反向切入与你的「{persona.tone if persona else '真实接地气'}」人设高度吻合，且是当前市场最稀缺的内容视角，爆款概率最高",
                "execution_tip": "①找一个真实且略有戏剧性的失败经历；②避免完全负面，结尾要有转折和建设性收获；③配图用真实生活场景，不要精修图",
            },
            "asset_pack": asset_pack,
        }


async def refine_content_asset(
    persona: PersonaSeed,
    topic: str,
    previous_result: dict,
    user_instruction: str,
    original_mode: str,
) -> dict:
    """追加指令：对已生成内容进行迭代优化"""
    persona_ctx = persona.to_prompt_context()
    previous_result_json = json.dumps(previous_result, ensure_ascii=False, indent=2)

    system = f"""你是KOC内容创作助手，正在对已生成的内容进行迭代优化。

【创作者账号定位】
{persona_ctx}

【原始选题】
{topic}

【上一轮生成结果】
{previous_result_json}

执行原则（必须全部遵守）：
1. 完整理解用户指令，精准执行，不要打折
2. 保留上一轮中用户没有要求修改的部分
3. 如果用户要求从分析模式（深模式）转为生成完整内容，基于深模式的最佳角度生成完整草稿（light模式结构）
4. 如果用户要求特定格式（视频文案/图文/脚本），严格按照该格式规范输出
5. 输出结果要明显体现用户指令的执行效果
6. change_summary用一句话总结做了哪些改动

视频文案格式规范（当用户要求视频文案/视频脚本时，refined_result中额外包含）：
{{
  "video_script": {{
    "duration_estimate": "预计时长",
    "scenes": [
      {{
        "scene_no": 1,
        "duration": "0-5秒",
        "visual": "画面描述",
        "narration": "口播文案",
        "subtitle": "字幕文字"
      }}
    ],
    "bgm_suggestion": "配乐建议",
    "shooting_tips": "拍摄注意事项"
  }}
}}

输出必须是合法JSON，结构如下（根据指令调整refined_result内容，但保持JSON合法）：
{{
  "refined_result": {{...根据指令调整后的完整结果，结构与上一轮相同或根据指令扩展...}},
  "change_summary": "用一句话说明本次做了哪些改动"
}}"""

    user_msg = f"用户追加指令：{user_instruction}\n\n请严格执行上述指令，输出迭代后的结果。"

    print(f"[AI] Calling refine_content_asset: topic={topic[:30]}, instruction={user_instruction[:30]}")
    result = await ai_client.chat(system, user_msg, json_mode=True)

    if result.get("fallback"):
        return {
            "refined_result": previous_result,
            "change_summary": "AI 暂时无法执行追加指令，请稍后重试",
        }

    result["original_mode"] = original_mode
    result["topic"] = topic
    return result
