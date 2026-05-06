from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import persona, topics, content, analytics, matching
from routers.advisor import advisor

app = FastAPI(
    title="KOC Copilot API",
    description="面向中腰部KOC的社媒AI Agent后端",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # TODO: 部署稳定后改回具体域名，如 ["https://your-app.vercel.app"]
    allow_credentials=False,  # allow_origins=["*"] 时 credentials 必须为 False
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(persona.router, prefix="/persona", tags=["人设种子"])
app.include_router(topics.router, prefix="/topics", tags=["选题推荐"])
app.include_router(content.router, prefix="/content", tags=["内容生成"])
app.include_router(analytics.router, prefix="/analytics", tags=["信任健康度"])
app.include_router(matching.router, prefix="/matching", tags=["品牌匹配"])
app.include_router(advisor, prefix="/advisor", tags=["AI顾问"])


@app.get("/")
async def root():
    return {"message": "KOC Copilot API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}
