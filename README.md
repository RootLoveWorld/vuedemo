# AI Workflow Platform

企业级AI工作流平台，支持可视化流程设计和本地大模型执行。

## 技术栈

### 前端

- **框架**: Vue 3.5+ (Composition API)
- **构建工具**: Vite 7
- **语言**: TypeScript 5.x
- **状态管理**: Pinia 2.x
- **UI组件**: Shadcn-vue + Tailwind CSS 4.x
- **流程图**: Vue Flow

### BFF层

- **框架**: NestJS 10+
- **语言**: TypeScript 5.x
- **数据库**: PostgreSQL 16+ with Prisma ORM
- **缓存**: Redis 7+
- **认证**: JWT + Passport.js

### AI服务

- **框架**: FastAPI 0.110+
- **语言**: Python 3.12+
- **AI框架**: LangChain + LangGraph
- **LLM**: Ollama (本地部署)

## 项目结构

```
ai-workflow-platform/
├── apps/
│   ├── frontend/          # Vue3前端应用
│   ├── bff/              # NestJS BFF服务
│   └── ai-service/       # Python AI服务
├── packages/
│   ├── shared-types/     # 共享TypeScript类型
│   ├── shared-utils/     # 共享工具函数
│   ├── shared-constants/ # 共享常量
│   └── shared-validators/# Zod验证schemas
└── docker/               # Docker配置
```

## 开发环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Python >= 3.12
- PostgreSQL >= 16
- Redis >= 7
- Ollama (用于本地LLM)

## 快速开始

### 1. 安装依赖

```bash
# 安装pnpm (如果未安装)
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 2. 环境配置

复制环境变量模板并配置：

```bash
# BFF环境变量
cp apps/bff/.env.example apps/bff/.env

# AI Service环境变量
cp apps/ai-service/.env.example apps/ai-service/.env

# Frontend环境变量
cp apps/frontend/.env.example apps/frontend/.env
```

### 3. 启动开发服务器

```bash
# 启动所有服务
pnpm dev

# 或单独启动某个服务
pnpm --filter frontend dev
pnpm --filter bff dev
pnpm --filter ai-service dev
```

### 4. 访问应用

- 前端: http://localhost:5173
- BFF API: http://localhost:3001
- AI Service: http://localhost:8000
- API文档: http://localhost:3001/api (Swagger)

## 可用脚本

```bash
# 开发
pnpm dev              # 启动所有服务
pnpm build            # 构建所有应用
pnpm test             # 运行所有测试
pnpm lint             # 代码检查
pnpm format           # 格式化代码
pnpm typecheck        # TypeScript类型检查
pnpm clean            # 清理构建产物
```

## Docker部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 项目特性

- ✅ Monorepo架构 (pnpm workspace + Turborepo)
- ✅ 全栈TypeScript (前端 + BFF)
- ✅ 可视化流程编辑器
- ✅ 本地大模型支持 (Ollama)
- ✅ 实时执行状态推送 (WebSocket)
- ✅ 多租户支持
- ✅ 插件系统
- ✅ Docker容器化部署
- ✅ 完整的监控和日志系统

## 开发规范

### 代码风格

- 使用ESLint + Prettier进行代码格式化
- 遵循Vue 3 Composition API最佳实践
- 使用TypeScript严格模式
- Python代码使用Black + Ruff

### Git提交规范

使用Conventional Commits规范：

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```

### 分支策略

- `main`: 生产环境分支
- `develop`: 开发分支
- `feature/*`: 功能分支
- `fix/*`: 修复分支

## 文档

- [架构设计](.kiro/specs/ai-workflow-platform/design.md)
- [需求文档](.kiro/specs/ai-workflow-platform/requirements.md)
- [任务清单](.kiro/specs/ai-workflow-platform/tasks.md)
- [API文档](http://localhost:3001/api)

## 许可证

MIT

## 贡献

欢迎提交Issue和Pull Request！
