from fastapi import APIRouter, Query
from services.topic_engine import get_topic_recommendations, calculate_blue_ocean_score
from services.persona_builder import _load_mock_persona
from services.trend_fetcher import get_trending_topics
from routers.persona import _persona_store

router = APIRouter()


@router.get("/recommendations/{user_id}", response_model=dict)
async def get_recommendations(user_id: str, count: int = Query(default=5, ge=1, le=10)):
    """获取基于人设的个性化选题推荐"""
    persona = _persona_store.get(user_id) or _load_mock_persona(user_id)
    result = await get_topic_recommendations(persona, count)
    return result


@router.get("/trending", response_model=dict)
async def get_trending(niche: str = Query(default="")):
    """获取实时热点数据（微博热搜 + Google Trends）"""
    data = await get_trending_topics(niche)
    return data


@router.get("/blue-ocean-score", response_model=dict)
async def compute_blue_ocean_score(
    heat: float = Query(..., ge=0, le=100),
    competition: float = Query(..., ge=0, le=1),
    trend: str = Query(default="stable"),
):
    """计算蓝海分数（用于前端实时预览）"""
    score = calculate_blue_ocean_score(heat, competition, trend)
    return {
        "blue_ocean_score": score,
        "label": "蓝海机会" if score > 15 else ("红海竞争" if score < 10 else "一般"),
    }
