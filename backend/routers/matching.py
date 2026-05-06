from fastapi import APIRouter
from services.brand_matcher import get_brand_matches
from services.persona_builder import _load_mock_persona
from routers.persona import _persona_store

router = APIRouter()


@router.get("/brands/{user_id}", response_model=dict)
async def get_matching_brands(user_id: str):
    """获取与KOC匹配的品牌列表（双向匹配）"""
    persona = _persona_store.get(user_id) or _load_mock_persona(user_id)
    return await get_brand_matches(persona)
