"""
RAG检索器：在AI生成内容前，先从知识库检索相关案例
让AI的建议从"凭感觉"变成"有依据"
"""
import json
import re

KNOWLEDGE_BASE = {
    "evergreen_patterns": [
        {
            "structure": "错误示范型",
            "formula": "我曾犯过X错误→原因→代价→正确做法",
            "hook": "【避坑】我犯过的X个严重错误",
            "why_works": "负面共鸣强，用户防御心理驱动收藏",
            "engagement": "high",
            "suitable_for": ["职场", "育儿", "美妆护肤", "宠物"],
        },
        {
            "structure": "信息差型",
            "formula": "90%的人不知道X→真相揭露→实操方法",
            "hook": "没人告诉你的X个真相",
            "why_works": "好奇心+优越感双重驱动，分享欲强",
            "engagement": "high",
            "suitable_for": ["职场", "数码科技", "健身运动", "穿搭"],
        },
        {
            "structure": "成长复盘型",
            "formula": "X年前的我→转折点→现在的结果→给同路人的建议",
            "hook": "X年后我终于明白了...",
            "why_works": "时间跨度制造可信度，情感认同强",
            "engagement": "medium-high",
            "suitable_for": ["职场", "个人成长", "创业", "母婴育儿"],
        },
        {
            "structure": "对比反转型",
            "formula": "大家以为X→实际上是Y→我的亲身验证",
            "hook": "我以为X，结果完全相反",
            "why_works": "认知冲突制造悬念，完播率高",
            "engagement": "high",
            "suitable_for": ["美食探店", "穿搭", "数码科技", "健身运动"],
        },
        {
            "structure": "清单干货型",
            "formula": "X个方法解决Y问题→逐条展开→总结",
            "hook": "收藏！X个让你受益终身的Y技巧",
            "why_works": "收藏率极高，搜索长尾流量稳定",
            "engagement": "medium",
            "suitable_for": ["全垂类"],
        },
    ],
    "trending_patterns": [
        {
            "structure": "热点借势型",
            "formula": "热点事件→关联到垂类→个人观点→互动引导",
            "why_works": "算法推流加持，时效性强",
            "risk": "时效短，需在热点24小时内发布",
        },
        {
            "structure": "挑战参与型",
            "formula": "参与平台挑战→加入个人特色→差异化展示",
            "why_works": "平台流量倾斜，门槛低",
        },
    ],
    "platform_rules": {
        "小红书": {
            "title_max": 20,
            "best_length": "800-1500字",
            "hook_style": "封面强视觉+标题含数字或疑问",
            "trust_signal": "真实场景图+细节描述+使用体验",
            "best_time": ["7:00-9:00", "12:00-13:30", "21:00-23:00"],
            "tags": "5-8个，前2个必须是大类话题",
            "engagement_tip": "结尾必须有明确提问，引导评论",
            "algorithm": "收藏率权重>点赞，前3张图决定封面CTR",
        },
        "抖音": {
            "hook_style": "前3秒必须有强冲突或悬念",
            "best_length": "30-60秒完播率最优",
            "trust_signal": "真实情绪+节奏感+反转结构",
            "best_time": ["12:00-14:00", "18:00-20:00", "21:00-23:00"],
            "algorithm": "完播率>互动率，开头决定推流量级",
        },
        "视频号": {
            "hook_style": "价值观共鸣，熟人愿意转发",
            "best_length": "1-3分钟",
            "trust_signal": "私域属性强，真实感第一",
            "algorithm": "转发权重最高，内容要让人想分享给朋友",
        },
        "B站": {
            "hook_style": "前15秒交代清楚视频价值",
            "best_length": "5-15分钟中长视频",
            "trust_signal": "信息密度高，专业感强",
            "algorithm": "弹幕+投币权重高，完播决定推荐量",
        },
        "微博": {
            "hook_style": "观点鲜明，标题即结论",
            "best_length": "140字精华或500字深度",
            "trust_signal": "热点关联+个人观点",
            "algorithm": "热搜词带流量，互动率影响权重",
        },
    },
    "niche_insights": {
        "职场": {
            "top_pain_points": ["升职加薪", "职场关系", "工作效率", "副业", "跳槽"],
            "blue_ocean": ["向上管理技巧", "职场边界感", "会议表达力"],
            "avoid": ["过度说教", "假大空励志", "无干货纯情绪"],
            "audience_psychology": "焦虑+渴望改变，需要具体可操作的方法",
        },
        "美妆护肤": {
            "top_pain_points": ["性价比好物", "成分避坑", "适合自己的产品"],
            "blue_ocean": ["男士护肤", "孕期护肤", "敏感肌日常"],
            "avoid": ["过度推广感", "成分党专业术语堆砌"],
            "audience_psychology": "怕踩雷，信任真实体验>品牌广告",
        },
        "宠物": {
            "top_pain_points": ["养宠知识", "宠物健康", "萌宠日常"],
            "blue_ocean": ["流浪动物救助", "老年宠物护理", "多宠家庭"],
            "avoid": ["卖惨博同情", "强行商业推广"],
            "audience_psychology": "情感共鸣驱动，愿意为真实故事买单",
        },
        "穿搭": {
            "top_pain_points": ["显高显瘦", "职场穿搭", "平价好物"],
            "blue_ocean": ["大码穿搭", "换季过渡期", "极简衣橱"],
            "avoid": ["只晒贵价品", "脱离真实生活场景"],
            "audience_psychology": "想要低成本变好看，需要可复制的方案",
        },
        "美食探店": {
            "top_pain_points": ["性价比探店", "踩坑避雷", "周末去哪吃"],
            "blue_ocean": ["小众本地特色", "夜宵探店", "一人食餐厅"],
            "avoid": ["纯广告植入", "缺乏真实体验描述"],
            "audience_psychology": "想吃好又不想踩雷，信任有细节的真实体验",
        },
        "健身运动": {
            "top_pain_points": ["减脂增肌", "坚持不下去", "家庭健身"],
            "blue_ocean": ["中年健身", "上班族碎片化运动", "女性力量训练"],
            "avoid": ["过于专业化术语", "完美身材展示压力"],
            "audience_psychology": "想改变但懒，需要低门槛的开始方式",
        },
    },
}


def retrieve_for_content_creation(
    niche: str,
    topic: str,
    platform: str,
    mode: str,
) -> dict:
    """根据垂类、选题、平台、模式检索最相关的知识，返回注入Prompt的上下文"""
    result = {}
    niche_key = _match_niche(niche)

    result["platform_rules"] = KNOWLEDGE_BASE["platform_rules"].get(
        platform, KNOWLEDGE_BASE["platform_rules"]["小红书"]
    )
    result["niche_insights"] = KNOWLEDGE_BASE["niche_insights"].get(niche_key, {})

    if mode == "light":
        result["recommended_structures"] = [
            p for p in KNOWLEDGE_BASE["evergreen_patterns"]
            if niche_key in p["suitable_for"] or "全垂类" in p["suitable_for"]
        ][:2]
    elif mode == "deep":
        result["all_patterns"] = KNOWLEDGE_BASE["evergreen_patterns"]
        result["trending_patterns"] = KNOWLEDGE_BASE["trending_patterns"]
    else:  # medium
        result["recommended_structures"] = KNOWLEDGE_BASE["evergreen_patterns"][:3]

    return result


def _match_niche(niche: str) -> str:
    mapping = {
        "职场": "职场", "效率": "职场", "成长": "职场",
        "美妆": "美妆护肤", "护肤": "美妆护肤", "美容": "美妆护肤",
        "宠物": "宠物", "猫": "宠物", "狗": "宠物",
        "穿搭": "穿搭", "时尚": "穿搭",
        "美食": "美食探店", "探店": "美食探店",
        "健身": "健身运动", "运动": "健身运动",
    }
    for key, val in mapping.items():
        if key in niche:
            return val
    return niche
