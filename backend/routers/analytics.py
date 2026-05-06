from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from services.trust_monitor import get_analytics_dashboard, update_flywheel
from services.persona_builder import _load_mock_persona
from routers.persona import _persona_store

router = APIRouter()


class FlywheelUpdateRequest(BaseModel):
    user_id: str
    avg_engagement_rate: Optional[float] = None
    commercial_ratio: Optional[float] = None
    evergreen_ratio: Optional[float] = None
    follower_count: Optional[int] = None


@router.get("/{user_id}", response_model=dict)
async def get_analytics(user_id: str):
    """获取信任健康度仪表盘数据"""
    persona = _persona_store.get(user_id) or _load_mock_persona(user_id)
    return get_analytics_dashboard(persona)


@router.post("/flywheel/update", response_model=dict)
async def update_flywheel_data(req: FlywheelUpdateRequest):
    """数据飞轮：回流数据更新人设版本"""
    persona = _persona_store.get(req.user_id) or _load_mock_persona(req.user_id)
    new_data = req.model_dump(exclude={"user_id"}, exclude_none=True)
    updated = update_flywheel(persona, new_data)
    _persona_store[req.user_id] = updated
    return {
        "version": updated.version,
        "trust_score": updated.trust_score,
        "message": f"人设种子已更新至v{updated.version}，飞轮转动一圈",
    }
