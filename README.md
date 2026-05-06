# KOC Copilot

> 面向中腰部内容创作者（1000-20000粉）的 AI 成长助手  
> 以账号定位为种子，程序化推演最优内容策略

---

## 🌐 在线访问

**产品 Demo：** https://koc-copilot.vercel.app  
**API 文档：** https://koc-copilot.onrender.com/docs  
**后端接口：** https://koc-copilot.onrender.com

> 无需本地部署，直接访问线上版本即可体验完整功能。

---

## 产品简介

KOC Copilot 解决内容创作者最核心的三个困境：

- **不知道发什么** → 蓝海选题算法，找到竞争少但热度高的内容机会
- **互动率下滑** → 信任健康度仪表盘，实时监测账号状态并给出改善路径
- **接广告掉粉** → 商业内容占比预警，帮你找到变现与信任的平衡点

核心逻辑：用你的「账号定位种子」驱动所有推荐，每次内容发布后数据回流更新种子，形成持续进化的飞轮。

---

## 主要功能

| 功能模块 | 说明 |
|---------|------|
| **账号定位设置** | 导入历史内容或填写问卷，AI 生成专属定位档案 |
| **蓝海选题地图** | 蓝海分算法（热度 × 低竞争 × 趋势）推荐个性化选题 |
| **三档内容创作** | 轻模式（全文草稿）/ 中模式（框架）/ 深模式（市场分析） |
| **内容精修** | 快捷指令或自定义要求迭代内容，保留最多 3 个历史版本 |
| **信任健康度** | 信任分仪表盘 + 内容结构分析 + AI 提升路径规划 |
| **品牌匹配** | 基于账号定位的品牌合作推荐，避免接不匹配的广告 |
| **AI 顾问** | 了解你完整背景的多轮对话成长教练 |

---

## 技术栈

```
后端：Python 3.11 + FastAPI + Pydantic v2
前端：React 19 + TypeScript + Zustand + Recharts + Tailwind CSS
AI：DeepSeek V4（API: deepseek-chat）
部署：Render（后端）+ Vercel（前端）
```

---

## 本地开发启动（可选）

> 如需本地开发调试，按以下步骤操作：

```bash
# 后端
cd backend
pip install -r requirements.txt
cp .env.example .env        # 填写 DEEPSEEK_API_KEY
uvicorn main:app --reload --port 8000

# 前端
cd frontend
npm install
npm start
```

访问 http://localhost:3000，接口文档：http://localhost:8000/docs

---

## 文档

| 文档 | 说明 |
|------|------|
| [产品说明](docs/product_overview.md) | 产品设计理念、核心算法、功能详解、竞品对比 |
| [技术文档](docs/technical_doc.md) | 系统架构、数据模型、API 参考、部署配置 |
| [用户手册](docs/user_guide.md) | 操作指南、使用技巧、常见问题 |

PDF 版本：[product_overview.pdf](docs/product_overview.pdf) · [technical_doc.pdf](docs/technical_doc.pdf) · [user_guide.pdf](docs/user_guide.pdf)

---

## 项目结构

```
koc-copilot/
├── backend/
│   ├── main.py                 # FastAPI 入口（端口 8000）
│   ├── routers/                # API 路由层
│   ├── services/               # 业务逻辑（AI 调用、算法）
│   └── data/mock/              # Demo 模拟数据
├── frontend/
│   └── src/
│       ├── pages/              # 页面组件
│       ├── components/         # 通用组件
│       ├── store/              # Zustand 全局状态
│       └── api/                # 接口封装
└── docs/                       # 文档（MD + PDF）
```

---

## 环境变量

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（必填） |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` |
| `REACT_APP_API_URL` | 前端指向的后端地址，本地默认 `http://localhost:8000` |
