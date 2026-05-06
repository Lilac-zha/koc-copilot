"""
实时热点数据抓取服务
- 微博热搜：公开接口，无需鉴权
- Google Trends：pytrends 库
"""
import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx

CACHE_DIR = Path(__file__).parent.parent / "data" / "trend_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

WEIBO_HOT_URL = "https://weibo.com/ajax/side/hotSearch"
WEIBO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://weibo.com/",
}

_trend_cache: dict = {}
_cache_timestamp: Optional[datetime] = None
CACHE_TTL_SECONDS = 1800  # 30 minutes


async def fetch_weibo_hot() -> list[dict]:
    """抓取微博热搜榜 Top20"""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(WEIBO_HOT_URL, headers=WEIBO_HEADERS)
            data = resp.json()
            items = data.get("data", {}).get("realtime", [])
            result = []
            for item in items[:20]:
                result.append({
                    "title": item.get("note") or item.get("word", ""),
                    "heat": item.get("raw_hot", 0),
                    "label": item.get("label_name", ""),
                    "source": "weibo",
                })
            print(f"[Trend] Weibo hot fetched: {len(result)} items")
            return result
    except Exception as e:
        print(f"[Trend] Weibo fetch failed: {e}")
        return _load_fallback_weibo()


def fetch_google_trends(keywords: list[str], geo: str = "CN") -> dict[str, int]:
    """使用 pytrends 查询关键词热度（同步函数，在线程池中执行）"""
    try:
        from pytrends.request import TrendReq
        pt = TrendReq(hl="zh-CN", tz=480, timeout=(8, 25))
        kw_list = keywords[:5]  # pytrends max 5
        pt.build_payload(kw_list, cat=0, timeframe="now 7-d", geo=geo)
        df = pt.interest_over_time()
        if df.empty:
            return {kw: 50 for kw in kw_list}
        result = {}
        for kw in kw_list:
            if kw in df.columns:
                result[kw] = int(df[kw].mean())
            else:
                result[kw] = 50
        print(f"[Trend] Google Trends fetched for: {kw_list}")
        return result
    except ImportError:
        print("[Trend] pytrends not installed, skipping Google Trends")
        return {kw: 60 for kw in keywords}
    except Exception as e:
        print(f"[Trend] Google Trends failed: {e}")
        return {kw: 60 for kw in keywords}


async def get_trending_topics(niche: str = "") -> dict:
    """
    获取综合热点数据（带缓存）
    返回: { weibo: [...], google_trends: {...}, generated_at: "..." }
    """
    global _trend_cache, _cache_timestamp

    now = datetime.now()
    if _cache_timestamp and (now - _cache_timestamp).seconds < CACHE_TTL_SECONDS and _trend_cache:
        print("[Trend] Returning cached trend data")
        return _trend_cache

    weibo = await fetch_weibo_hot()

    niche_keywords = _extract_niche_keywords(niche)
    google = await asyncio.get_event_loop().run_in_executor(
        None, fetch_google_trends, niche_keywords
    )

    result = {
        "weibo": weibo,
        "google_trends": google,
        "generated_at": now.isoformat(),
    }

    _trend_cache = result
    _cache_timestamp = now

    # Save to disk cache
    try:
        cache_path = CACHE_DIR / "latest_trends.json"
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

    return result


def _extract_niche_keywords(niche: str) -> list[str]:
    """从垂类描述提取关键词"""
    niche_keyword_map = {
        "职场": ["职场技巧", "升职加薪", "职场焦虑"],
        "效率": ["效率工具", "时间管理", "工作效率"],
        "成长": ["个人成长", "自我提升", "读书学习"],
        "美妆": ["护肤", "美妆测评", "化妆品"],
        "穿搭": ["穿搭", "时尚", "outfit"],
        "美食": ["探店", "美食", "食谱"],
        "健身": ["健身", "减脂", "运动"],
        "旅行": ["旅行", "攻略", "出游"],
        "数码": ["数码", "科技", "手机评测"],
    }
    for key, kws in niche_keyword_map.items():
        if key in niche:
            return kws
    return ["内容创作", "自媒体", "涨粉"]


def get_trend_summary_for_prompt(niche: str = "", weibo_data: list = None) -> str:
    """生成可注入prompt的热点摘要"""
    if not weibo_data:
        return ""

    top5 = [item["title"] for item in weibo_data[:5] if item.get("title")]
    if not top5:
        return ""

    return f"【当前微博热搜（可借势）】：{'、'.join(top5)}"


def _load_fallback_weibo() -> list[dict]:
    """从磁盘缓存加载备用数据"""
    try:
        cache_path = CACHE_DIR / "latest_trends.json"
        if cache_path.exists():
            with open(cache_path, encoding="utf-8") as f:
                data = json.load(f)
                return data.get("weibo", [])
    except Exception:
        pass
    return [
        {"title": "职场内卷", "heat": 500000, "source": "weibo"},
        {"title": "35岁危机", "heat": 400000, "source": "weibo"},
        {"title": "副业变现", "heat": 350000, "source": "weibo"},
    ]
