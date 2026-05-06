from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
import json
from pathlib import Path
from datetime import datetime
from services.persona_builder import (
    PersonaSeed,
    build_from_content,
    build_from_questionnaire,
    _load_mock_persona,
)

INSIGHTS_FILE = Path(__file__).parent.parent / "data" / "user_insights.json"


def _save_user_insights(insights: List[dict]):
    """将用户'其他'输入保存到洞察文件"""
    if not insights:
        return
    try:
        existing = []
        if INSIGHTS_FILE.exists():
            with open(INSIGHTS_FILE, encoding="utf-8") as f:
                existing = json.load(f)
        existing.extend(insights)
        with open(INSIGHTS_FILE, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Insights] Failed to save: {e}")

router = APIRouter()

# MOCK - 内存存储，替换为数据库
_persona_store: Dict[str, PersonaSeed] = {}


class ContentImportRequest(BaseModel):
    user_id: str
    platform: str
    content_samples: List[str]


class QuestionnaireRequest(BaseModel):
    user_id: str
    platform: str
    answers: Dict[str, str]
    other_inputs: Optional[Dict[str, str]] = None  # 用户填写的"其他"选项


@router.post("/build/from-content", response_model=dict)
async def build_persona_from_content(req: ContentImportRequest):
    """AC路径：导入历史内容，AI逆向提炼人设"""
    if not req.content_samples:
        raise HTTPException(status_code=400, detail="至少需要提供1条历史内容")
    persona = await build_from_content(req.user_id, req.content_samples, req.platform)
    _persona_store[req.user_id] = persona
    return persona.model_dump()


@router.post("/build/from-questionnaire", response_model=dict)
async def build_persona_from_questionnaire(req: QuestionnaireRequest):
    """B路径：填写问卷，AI正向构建人设"""
    # 保存用户洞察数据（"其他"选项的填写内容）
    if req.other_inputs:
        insights = [
            {
                "timestamp": datetime.now().isoformat(),
                "question": q,
                "user_input": text,
                "platform": req.platform,
            }
            for q, text in req.other_inputs.items()
            if text.strip()
        ]
        _save_user_insights(insights)

    persona = await build_from_questionnaire(req.user_id, req.answers, req.platform)
    _persona_store[req.user_id] = persona
    return persona.model_dump()


@router.get("/demo", response_model=dict)
async def get_demo_persona():
    """获取演示用人设数据（无需登录）"""
    persona = _load_mock_persona("demo_user_001")
    _persona_store["demo_user_001"] = persona
    return persona.model_dump()


@router.get("/{user_id}", response_model=dict)
async def get_persona(user_id: str):
    """获取用户人设种子"""
    if user_id not in _persona_store:
        # MOCK - 返回演示数据
        persona = _load_mock_persona(user_id)
        _persona_store[user_id] = persona
    return _persona_store[user_id].model_dump()
