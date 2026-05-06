# CLAUDE.md — KOC Copilot 项目工作手册
> Claude Code 每次启动自动读取此文件。这是你的工作手册，不是产品文档。
> 产品设计详情见 CONTEXT.md

---

## 🎯 这个项目是什么

**KOC Copilot** — 面向中腰部KOC（1000-20000粉、增长停滞阶段）的社媒AI Agent。
核心价值：以人设为种子，程序化推演最优内容策略，帮助KOC低成本高效率实现账号成长。

这是一个**比赛项目**，需要有可展示的Demo，评分维度见 CONTEXT.md 末尾。

---

## 🏗️ 技术栈（已确定，不要改变）

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端 | Python + FastAPI | 主后端框架 |
| 前端 | React + TypeScript | UI层 |
| AI模型 | DeepSeek API（主力）| 兼容OpenAI SDK，中文能力强 |
| 样式 | Tailwind CSS | 快速UI开发 |
| 图表 | Recharts | 数据可视化 |
| 包管理 | pip（后端）/ npm（前端）| 标准配置 |

---

## 📁 项目结构（严格遵守）

```
koc-copilot/
├── CLAUDE.md              ← 你现在读的这个
├── CONTEXT.md             ← 产品设计文档（需要理解业务时读这个）
├── README.md              ← 项目说明
│
├── backend/
│   ├── main.py            ← FastAPI入口，端口8000
│   ├── requirements.txt
│   ├── .env               ← API Keys（不要提交git）
│   ├── .env.example       ← 环境变量模板
│   │
│   ├── routers/           ← 路由层，只做请求/响应处理
│   │   ├── persona.py     ← 人设种子相关接口
│   │   ├── topics.py      ← 选题推荐接口
│   │   ├── content.py     ← 内容生成接口
│   │   ├── analytics.py   ← 信任健康度接口
│   │   └── matching.py    ← ToB品牌匹配接口
│   │
│   ├── services/          ← 业务逻辑层（核心代码在这里）
│   │   ├── ai_client.py   ← AI模型抽象层（所有AI调用走这里）
│   │   ├── persona_builder.py  ← 人设种子构建（最核心模块）
│   │   ├── topic_engine.py     ← 选题引擎+蓝海算法
│   │   ├── trust_monitor.py    ← 信任健康度监测
│   │   └── brand_matcher.py    ← 品牌匹配逻辑
│   │
│   └── data/
│       └── mock/          ← Demo用的模拟数据（JSON文件）
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Onboarding/    ← 冷启动（Demo第一幕）
        │   ├── Dashboard/     ← 主仪表盘
        │   ├── TopicMap/      ← 选题地图（Demo核心亮点）
        │   ├── Create/        ← 内容创作（三档模式）
        │   ├── Analytics/     ← 信任健康度仪表盘
        │   └── Matching/      ← 品牌匹配（ToB功能）
        ├── components/
        │   ├── common/        ← 通用组件
        │   └── charts/        ← 图表组件
        ├── hooks/             ← 自定义React Hooks
        ├── store/             ← 状态管理（persona seed全局状态）
        └── api/               ← 后端接口封装
```

---

## ⚙️ 启动命令

```bash
# 后端
cd backend
pip install -r requirements.txt
cp .env.example .env      # 然后填写 DEEPSEEK_API_KEY
uvicorn main:app --reload --port 8000
# 验证：http://localhost:8000/docs

# 前端（首次需要初始化）
cd frontend
npm install
npm start
# 运行在：http://localhost:3000
```

---

## 🔑 核心数据结构（必须理解）

### PersonaSeed（人设种子）— 整个系统的核心
```python
class PersonaSeed:
    user_id: str
    version: int              # 每次数据回流后递增，体现飞轮

    # 人设维度
    niche: str                # 内容垂类
    tone: str                 # 语言风格
    values: list[str]         # 价值观标签
    target_audience: str      # 目标受众
    content_strengths: list[str]
    language_patterns: list[str]

    # 账号状态
    platform: str             # 主平台
    growth_stage: str         # growth / plateau / declining
    trust_score: float        # 信任健康度 0-100
    commercial_ratio: float   # 商业内容占比（超20%触发预警）
    evergreen_ratio: float    # 常青内容比例（目标70%）
```

**重要原则：所有AI推荐和内容生成，必须以PersonaSeed为输入，不能脱离人设生成内容。**

---

## 🤖 AI调用规范

所有AI调用**必须走 `services/ai_client.py`**，不允许在其他地方直接调用API。

```python
# ✅ 正确
from services.ai_client import ai_client
result = await ai_client.chat(system_prompt, user_message, json_mode=True)

# ❌ 错误 - 不要在业务逻辑里直接实例化client
client = OpenAI(api_key="...")
```

AI输出**必须是JSON格式**（json_mode=True），方便前端解析。

---

## 📊 蓝海算法（核心创新，保持逻辑不变）

```python
蓝海分 = 热度(0-100) × (1 - 竞争度(0-1)) × 成长系数
成长系数: rising=1.3 / stable=1.0 / declining=0.7

# 蓝海分 > 15 = 蓝海机会
# 蓝海分 < 10 = 红海竞争
```

---

## 🎨 三档介入模式（前端必须清晰呈现）

| 档位 | 英文Key | AI产出 | 适用场景 |
|------|---------|--------|---------|
| 轻模式 | `light` | 完整内容草稿 | 日常维活 |
| 中模式 | `medium` | 结构框架+要点 | 常规内容 |
| 深模式 | `deep` | 角度分析建议 | 核心爆款 |

---

## 📈 信任健康度预警阈值

```
≥ 80分  绿色 "健康"
60-79分  黄色 "注意"
40-59分  橙色 "预警"
< 40分   红色 "危险"

商业内容占比 > 20% → 开始折旧
商业内容占比 > 40% → 强预警
```

---

## 🎯 Demo展示的五幕脚本（开发优先级依据）

```
第一幕：冷启动（Onboarding）    ← 优先级1
  → 用户选择路径：导入历史内容 或 填写问卷
  → AI分析后展示"AI眼中的你"（人设档案）

第二幕：选题地图（TopicMap）    ← 优先级2（最核心亮点）
  → 蓝海分析可视化
  → 个性化选题推荐 + 差异化理由

第三幕：内容创作（Create）      ← 优先级3
  → 三档模式切换
  → 内容资产包展示

第四幕：信任健康度（Analytics） ← 优先级4
  → 仪表盘 + 预警信号

第五幕：品牌匹配（Matching）    ← 优先级5（ToB加分项）
  → KOC ↔ 品牌双向筛选
```

---

## ⚠️ 开发注意事项

1. **数据层**：Demo阶段使用 `data/mock/` 下的JSON文件，所有mock数据标注 `# MOCK - 替换为真实数据源` 注释
2. **平台数据**：小红书/视频号无开放API，不要尝试抓取，用mock数据展示逻辑
3. **人设一致性**：每次内容生成前必须调用 `check_persona_consistency()`
4. **状态管理**：PersonaSeed对象在前端用全局状态管理（推荐Zustand或Context API）
5. **错误处理**：AI接口必须有fallback，不能因为API失败导致页面崩溃

---

## 📋 当前开发状态

- [x] 后端架构设计完成
- [x] `ai_client.py` — AI抽象层
- [x] `persona_builder.py` — 人设种子构建（AC路径+B路径+一致性守卫）
- [x] `topic_engine.py` — 选题引擎+蓝海算法+内容资产包
- [x] `trust_monitor.py` — 信任健康度+数据飞轮
- [x] `routers/` — 所有API路由
- [ ] 后端路由拆分为独立文件（目前在__init__.py里）
- [ ] 前端初始化
- [ ] Onboarding页面
- [ ] TopicMap页面
- [ ] Create页面
- [ ] Analytics页面
- [ ] Matching页面
