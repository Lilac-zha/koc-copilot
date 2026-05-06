from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
from services.topic_engine import generate_content_asset, refine_content_asset
from services.persona_builder import _load_mock_persona
from routers.persona import _persona_store

router = APIRouter()


class ContentGenerateRequest(BaseModel):
    user_id: str
    topic: dict
    mode: Literal["light", "medium", "deep"] = "medium"


@router.post("/generate", response_model=dict)
async def generate_content(req: ContentGenerateRequest):
    """三档介入模式内容生成"""
    if req.mode not in ("light", "medium", "deep"):
        raise HTTPException(status_code=400, detail="mode必须为 light / medium / deep")

    persona = _persona_store.get(req.user_id) or _load_mock_persona(req.user_id)
    result = await generate_content_asset(persona, req.topic, req.mode)
    return result


@router.post("/analyze-topic", response_model=dict)
async def analyze_custom_topic(req: ContentGenerateRequest):
    """分析自定义选题，生成资产包预览（用于选题地图自定义输入）"""
    persona = _persona_store.get(req.user_id) or _load_mock_persona(req.user_id)
    result = await generate_content_asset(persona, req.topic, req.mode)
    return result


class ContentRefineRequest(BaseModel):
    user_id: str
    topic: str
    previous_result: dict
    user_instruction: str
    original_mode: str = "medium"


@router.post("/refine", response_model=dict)
async def refine_content(req: ContentRefineRequest):
    """追加指令：对已生成内容进行迭代优化"""
    persona = _persona_store.get(req.user_id) or _load_mock_persona(req.user_id)
    result = await refine_content_asset(
        persona, req.topic, req.previous_result, req.user_instruction, req.original_mode
    )
    return result
