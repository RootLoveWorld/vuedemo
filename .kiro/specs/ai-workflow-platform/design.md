# 架构设计文档

## 概述

本文档描述AI工作流平台的技术架构设计。系统采用**BFF (Backend For Frontend) 架构**，基于pnpm monorepo管理，前端使用Vue3生态构建可视化流程编辑器，BFF层使用NestJS提供TypeScript统一的API服务，后端使用Python+LangChain/LangGraph实现AI工作流执行引擎，支持Docker容器化部署。

### 架构选型说明

**为什么采用BFF架构？**

1. **全栈TypeScript统一**: 前端和BFF完全共享类型定义，无需类型转换
2. **关注点分离**: BFF处理业务逻辑、认证授权，Python专注AI工作流
3. **更好的开发体验**: 统一的工具链和开发模式
4. **未来扩展性**: 便于支持多端（移动端、桌面端）
5. **类型安全**: 端到端的类型检查，减少运行时错误

**技术栈分工:**

- **NestJS BFF**:
  - 用户认证和授权
  - 工作流CRUD操作
  - 数据库访问（PostgreSQL）
  - API聚合和转换
  - WebSocket实时通信
  - 与前端共享TypeScript类型

- **Python AI Service**:
  - LangGraph工作流引擎
  - AI节点执行器
  - Ollama模型调用
  - 工作流执行状态管理
  - 通过HTTP/gRPC与BFF通信

## 整体架构

### 系统架构图

```mermaid
graph TB
    subgraph "前端层"
        A[Vue3 + Vite7]
        B[Flow Editor]
        C[Pinia Store]
    end

    subgraph "BFF层 - NestJS"
        D[API Gateway]
        E[Auth Module]
        F[Workflow Module]
        G[Execution Module]
        H[WebSocket Gateway]
    end

    subgraph "AI服务层 - Python"
        I[FastAPI Server]
        J[Workflow Engine<br/>LangGraph]
        K[Node Executors]
        L[Ollama Client]
    end

    subgraph "外部服务"
        M[Ollama<br/>LLM Models]
    end

    subgraph "数据层"
        N[(PostgreSQL)]
        O[(Redis)]
    end

    A --> D
    B --> A
    C --> A

    D --> E
    D --> F
    D --> G
    D --> H

    E --> N
    F --> N
    F --> I
    G --> I
    H --> I

    I --> J
    J --> K
    K --> L
    L --> M

    D --> O
    I --> O
```

### 技术栈选型

**前端技术栈 (Vue3):**

- **框架**: Vue 3.5+ (Composition API, Vapor Mode Ready)
- **构建工具**: Vite 7
- **语言**: TypeScript 5.x
- **状态管理**: Pinia 2.x
- **路由**: Vue Router 4.x
- **流程图**: Vue Flow (@vue-flow/core)
- **UI组件**: Shadcn-vue (基于Radix Vue)
- **样式**: Tailwind CSS 4.x
- **图标**: Lucide Icons
- **HTTP客户端**: Ky (现代化fetch封装)
- **工具库**: VueUse, Lodash-es
- **验证**: Zod
- **动画**: Motion One / @vueuse/motion
- **测试**: Vitest + @vue/test-utils + Testing Library

**BFF层技术栈 (NestJS):**

- **框架**: NestJS 10+
- **语言**: TypeScript 5.x
- **数据库ORM**: Prisma 5+ (类型安全的ORM)
- **验证**: class-validator + class-transformer
- **认证**: Passport.js + JWT
- **WebSocket**: @nestjs/websockets + Socket.io
- **配置**: @nestjs/config
- **缓存**: @nestjs/cache-manager + Redis
- **日志**: Winston / Pino
- **API文档**: @nestjs/swagger (自动生成OpenAPI)
- **HTTP客户端**: Axios (调用Python服务)
- **测试**: Jest + Supertest

**AI服务技术栈 (Python):**

- **框架**: FastAPI 0.110+
- **语言**: Python 3.12+
- **依赖管理**: Poetry 或 uv
- **AI框架**: LangChain 0.1+, LangGraph 0.0.40+
- **LLM**: Ollama (本地部署)
- **验证**: Pydantic 2.x
- **异步**: asyncio, httpx
- **日志**: structlog
- **测试**: pytest, pytest-asyncio

**数据层:**

- **主数据库**: PostgreSQL 16+
- **缓存/队列**: Redis 7+
- **ORM**: Prisma (NestJS), SQLAlchemy (Python可选)

**共享包 (packages/):**

- **shared-types**: TypeScript类型定义（前端+BFF共享）
- **shared-utils**: 通用工具函数
- **shared-constants**: 常量定义
- **shared-validators**: Zod验证schemas

**DevOps:**

- **包管理**: pnpm 9+ (workspace模式)
- **构建工具**: Turborepo (可选，加速monorepo构建)
- **容器**: Docker, Docker Compose
- **代理**: Nginx / Traefik / Caddy
- **监控**: Prometheus + Grafana (可选)
- **日志**: ELK Stack / Loki + Grafana (可选)
- **CI/CD**: GitHub Actions / GitLab CI
- **代码质量**: SonarQube (可选)

## 项目结构

### Monorepo目录结构

采用`apps/`存放应用，`packages/`存放共享代码的标准monorepo结构：

- `apps/frontend`: Vue3前端应用
- `apps/bff`: NestJS BFF服务
- `apps/ai-service`: Python AI服务
- `packages/shared-*`: 前端和BFF共享的类型、工具、常量

```
ai-workflow-platform/
├── .github/                    # GitHub Actions CI/CD
├── .husky/                     # Git hooks
├── .vscode/                    # VSCode配置
├── apps/
│   ├── frontend/              # Vue3前端应用
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── ui/        # Shadcn-vue组件
│   │   │   │   ├── flow/      # 流程图组件
│   │   │   │   ├── nodes/     # 节点组件
│   │   │   │   └── common/
│   │   │   ├── composables/
│   │   │   ├── stores/        # Pinia stores
│   │   │   ├── views/
│   │   │   ├── router/
│   │   │   ├── api/           # BFF API客户端
│   │   │   ├── App.vue
│   │   │   └── main.ts
│   │   ├── tests/
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── bff/                   # NestJS BFF服务
│   │   ├── src/
│   │   │   ├── auth/          # 认证模块
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── guards/
│   │   │   │   └── strategies/
│   │   │   ├── workflows/     # 工作流模块
│   │   │   │   ├── workflows.controller.ts
│   │   │   │   ├── workflows.service.ts
│   │   │   │   ├── workflows.module.ts
│   │   │   │   └── dto/
│   │   │   ├── executions/    # 执行模块
│   │   │   │   ├── executions.controller.ts
│   │   │   │   ├── executions.service.ts
│   │   │   │   ├── executions.module.ts
│   │   │   │   ├── executions.gateway.ts  # WebSocket
│   │   │   │   └── dto/
│   │   │   ├── ai-service/    # AI服务客户端
│   │   │   │   ├── ai-service.client.ts
│   │   │   │   └── ai-service.module.ts
│   │   │   ├── users/         # 用户模块
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── users.module.ts
│   │   │   ├── common/        # 通用模块
│   │   │   │   ├── filters/   # 异常过滤器
│   │   │   │   ├── interceptors/
│   │   │   │   ├── pipes/
│   │   │   │   └── decorators/
│   │   │   ├── config/        # 配置
│   │   │   │   └── configuration.ts
│   │   │   ├── prisma/        # Prisma模块
│   │   │   │   ├── prisma.service.ts
│   │   │   │   └── prisma.module.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # Prisma schema
│   │   │   └── migrations/
│   │   ├── test/
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── ai-service/            # Python AI服务
│       ├── app/
│       │   ├── api/           # API路由
│       │   │   ├── v1/
│       │   │   │   ├── execute.py
│       │   │   │   └── models.py
│       │   │   └── deps.py
│       │   ├── core/          # 核心配置
│       │   │   ├── config.py
│       │   │   └── logging.py
│       │   ├── engine/        # 工作流引擎
│       │   │   ├── graph_builder.py
│       │   │   ├── executor.py
│       │   │   └── nodes/     # 节点执行器
│       │   │       ├── base.py
│       │   │       ├── llm_node.py
│       │   │       ├── condition_node.py
│       │   │       ├── transform_node.py
│       │   │       └── __init__.py
│       │   ├── services/      # 服务
│       │   │   ├── ollama_service.py
│       │   │   └── execution_service.py
│       │   ├── schemas/       # Pydantic schemas
│       │   │   ├── workflow.py
│       │   │   ├── execution.py
│       │   │   └── node.py
│       │   └── main.py
│       ├── tests/
│       ├── pyproject.toml
│       ├── poetry.lock
│       └── README.md
│
├── packages/                  # 共享包（前端+BFF）
│   ├── shared-types/          # TypeScript类型定义
│   │   ├── src/
│   │   │   ├── workflow.ts    # 工作流类型
│   │   │   ├── node.ts        # 节点类型
│   │   │   ├── execution.ts   # 执行类型
│   │   │   ├── user.ts        # 用户类型
│   │   │   ├── api.ts         # API请求/响应类型
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-utils/          # 工具函数
│   │   ├── src/
│   │   │   ├── validation.ts
│   │   │   ├── format.ts
│   │   │   ├── date.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-constants/      # 常量定义
│   │   ├── src/
│   │   │   ├── node-types.ts
│   │   │   ├── status.ts
│   │   │   ├── errors.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared-validators/     # Zod验证schemas
│       ├── src/
│       │   ├── workflow.schema.ts
│       │   ├── node.schema.ts
│       │   ├── execution.schema.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docker/                    # Docker配置
│   ├── frontend.Dockerfile
│   ├── bff.Dockerfile
│   ├── ai-service.Dockerfile
│   ├── nginx.conf
│   └── docker-compose.yml
│
├── docs/                      # 文档
├── scripts/                   # 脚本工具
├── pnpm-workspace.yaml        # pnpm workspace配置
├── package.json               # 根package.json
├── turbo.json                 # Turborepo配置(可选)
├── .gitignore
├── .prettierrc
├── .eslintrc.js
└── README.md
```

**pnpm-workspace.yaml配置:**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Tailwind CSS 4配置示例:**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Shadcn-vue主题变量
      },
    },
  },
  plugins: [],
} satisfies Config
```

**共享包使用示例:**

```typescript
// 前端使用共享类型和验证
import type { WorkflowDefinition, NodeType, CreateWorkflowDto } from '@workflow/shared-types'
import { NODE_TYPES, EXECUTION_STATUS } from '@workflow/shared-constants'
import { workflowSchema } from '@workflow/shared-validators'
import { formatDate } from '@workflow/shared-utils'

// BFF使用相同的类型
import type { WorkflowDefinition } from '@workflow/shared-types'
import { workflowSchema } from '@workflow/shared-validators'

// 类型完全统一，无需转换
const workflow: WorkflowDefinition = {
  id: '123',
  name: 'My Workflow',
  nodes: [],
  edges: [],
}

// Zod验证
const result = workflowSchema.safeParse(workflow)
```

## 核心组件设计

### 1. BFF层架构 (NestJS)

#### 模块设计

```mermaid
graph TB
    A[App Module] --> B[Auth Module]
    A --> C[Workflows Module]
    A --> D[Executions Module]
    A --> E[Users Module]
    A --> F[AI Service Client Module]
    A --> G[Prisma Module]

    C --> F
    D --> F
    C --> G
    D --> G
    E --> G
```

#### 核心模块说明

**Auth Module (认证模块)**

```typescript
// auth/auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async login(email: string, password: string) {
    // 验证用户
    const user = await this.validateUser(email, password)
    // 生成JWT token
    return {
      access_token: this.jwtService.sign({ sub: user.id, email: user.email }),
      user,
    }
  }

  async register(dto: RegisterDto) {
    // 创建用户
    const hashedPassword = await bcrypt.hash(dto.password, 10)
    return this.prisma.user.create({
      data: { ...dto, password: hashedPassword },
    })
  }
}
```

**Workflows Module (工作流模块)**

```typescript
// workflows/workflows.service.ts
import type { WorkflowDefinition, CreateWorkflowDto } from '@workflow/shared-types'
import { workflowSchema } from '@workflow/shared-validators'

@Injectable()
export class WorkflowsService {
  constructor(
    private prisma: PrismaService,
    private aiServiceClient: AiServiceClient
  ) {}

  async create(userId: string, dto: CreateWorkflowDto) {
    // Zod验证
    const validated = workflowSchema.parse(dto.definition)

    // 保存到数据库
    return this.prisma.workflow.create({
      data: {
        name: dto.name,
        description: dto.description,
        definition: validated as any,
        userId,
      },
    })
  }

  async findAll(userId: string) {
    return this.prisma.workflow.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string, userId: string) {
    return this.prisma.workflow.findFirst({
      where: { id, userId },
    })
  }

  async update(id: string, userId: string, dto: UpdateWorkflowDto) {
    return this.prisma.workflow.update({
      where: { id },
      data: dto,
    })
  }

  async delete(id: string, userId: string) {
    return this.prisma.workflow.delete({
      where: { id },
    })
  }
}
```

**Executions Module (执行模块)**

```typescript
// executions/executions.service.ts
@Injectable()
export class ExecutionsService {
  constructor(
    private prisma: PrismaService,
    private aiServiceClient: AiServiceClient,
    private executionsGateway: ExecutionsGateway
  ) {}

  async execute(workflowId: string, userId: string, inputData: any) {
    // 获取工作流定义
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    })

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    // 创建执行记录
    const execution = await this.prisma.execution.create({
      data: {
        workflowId,
        status: 'pending',
        inputData,
      },
    })

    // 异步调用AI服务执行工作流
    this.executeWorkflowAsync(execution.id, workflow.definition, inputData)

    return execution
  }

  private async executeWorkflowAsync(executionId: string, definition: any, inputData: any) {
    try {
      // 更新状态为running
      await this.prisma.execution.update({
        where: { id: executionId },
        data: { status: 'running', startedAt: new Date() },
      })

      // 通过WebSocket通知前端
      this.executionsGateway.sendStatus(executionId, 'running')

      // 调用Python AI服务
      const result = await this.aiServiceClient.executeWorkflow({
        executionId,
        definition,
        inputData,
      })

      // 更新执行结果
      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: 'completed',
          outputData: result,
          completedAt: new Date(),
        },
      })

      this.executionsGateway.sendResult(executionId, result)
    } catch (error) {
      // 处理错误
      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      })

      this.executionsGateway.sendError(executionId, error.message)
    }
  }
}
```

**WebSocket Gateway**

```typescript
// executions/executions.gateway.ts
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'executions',
})
export class ExecutionsGateway {
  @WebSocketServer()
  server: Server

  sendStatus(executionId: string, status: string) {
    this.server.to(executionId).emit('status', { executionId, status })
  }

  sendLog(executionId: string, log: any) {
    this.server.to(executionId).emit('log', { executionId, log })
  }

  sendResult(executionId: string, result: any) {
    this.server.to(executionId).emit('result', { executionId, result })
  }

  sendError(executionId: string, error: string) {
    this.server.to(executionId).emit('error', { executionId, error })
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, executionId: string) {
    client.join(executionId)
    return { event: 'subscribed', data: executionId }
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, executionId: string) {
    client.leave(executionId)
    return { event: 'unsubscribed', data: executionId }
  }
}
```

**AI Service Client**

```typescript
// ai-service/ai-service.client.ts
@Injectable()
export class AiServiceClient {
  private readonly httpService: HttpService
  private readonly baseUrl: string

  constructor(
    private configService: ConfigService,
    httpService: HttpService
  ) {
    this.httpService = httpService
    this.baseUrl = this.configService.get('AI_SERVICE_URL')
  }

  async executeWorkflow(payload: { executionId: string; definition: any; inputData: any }) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/api/v1/execute`, payload)
    )
    return response.data
  }

  async listModels() {
    const response = await firstValueFrom(this.httpService.get(`${this.baseUrl}/api/v1/models`))
    return response.data
  }

  async stopExecution(executionId: string) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/api/v1/execute/${executionId}/stop`)
    )
    return response.data
  }
}
```

#### Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  workflows  Workflow[]
  executions Execution[]
}

model Workflow {
  id          String   @id @default(uuid())
  name        String
  description String?
  definition  Json     // WorkflowDefinition
  version     Int      @default(1)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId     String
  user       User        @relation(fields: [userId], references: [id])
  executions Execution[]

  @@index([userId])
}

model Execution {
  id           String    @id @default(uuid())
  status       String    // pending, running, completed, failed
  inputData    Json?
  outputData   Json?
  errorMessage String?
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime  @default(now())

  workflowId String
  workflow   Workflow @relation(fields: [workflowId], references: [id])
  userId     String
  user       User     @relation(fields: [userId], references: [id])

  logs ExecutionLog[]

  @@index([workflowId])
  @@index([userId])
  @@index([status])
}

model ExecutionLog {
  id        String   @id @default(uuid())
  nodeId    String?
  level     String   // info, warning, error
  message   String
  metadata  Json?
  createdAt DateTime @default(now())

  executionId String
  execution   Execution @relation(fields: [executionId], references: [id])

  @@index([executionId])
}
```

### 2. 前端流程编辑器 (Flow Editor)

#### 组件架构

```mermaid
graph LR
    A[FlowCanvas] --> B[NodePalette]
    A --> C[FlowRenderer]
    A --> D[PropertyPanel]
    C --> E[CustomNodes]
    C --> F[CustomEdges]
    A --> G[Toolbar]
    A --> H[MiniMap]
```

#### 核心组件说明

**FlowCanvas (主画布组件)**

- 基于Vue Flow实现
- 管理节点和边的状态
- 处理拖拽、连接、选择等交互
- 集成Pinia store管理工作流状态

**NodePalette (节点面板)**

- 展示可用节点类型
- 支持拖拽添加节点
- 节点分类：输入、处理、AI、条件、输出

**PropertyPanel (属性面板)**

- 显示选中节点/边的属性
- 动态表单配置
- 实时验证和保存

**CustomNodes (自定义节点)**
节点类型设计：

1. **InputNode**: 接收外部输入
2. **LLMNode**: 调用大语言模型
3. **ConditionNode**: 条件分支
4. **TransformNode**: 数据转换
5. **OutputNode**: 输出结果
6. **LoopNode**: 循环处理
7. **MergeNode**: 合并多个输入

#### 状态管理 (Pinia Stores)

**workflowStore**

```typescript
interface WorkflowState {
  currentWorkflow: Workflow | null
  workflows: Workflow[]
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  isExecuting: boolean
}
```

**executionStore**

```typescript
interface ExecutionState {
  currentExecution: Execution | null
  executionHistory: Execution[]
  logs: ExecutionLog[]
  realTimeStatus: Map<string, NodeStatus>
}
```

### 3. Python AI服务 (Workflow Engine)

#### 引擎架构

```mermaid
graph TB
    A[API Layer] --> B[Workflow Service]
    B --> C[Graph Builder]
    C --> D[LangGraph Engine]
    D --> E[Node Executor Registry]
    E --> F1[LLM Executor]
    E --> F2[Condition Executor]
    E --> F3[Transform Executor]
    F1 --> G[Ollama Service]
    D --> H[State Manager]
    H --> I[(Database)]
```

#### 核心类设计

**WorkflowEngine**

```python
class WorkflowEngine:
    """工作流执行引擎"""

    def __init__(self, db_session, ollama_service):
        self.db = db_session
        self.ollama = ollama_service
        self.executor_registry = NodeExecutorRegistry()

    async def execute_workflow(
        self,
        workflow_id: str,
        input_data: dict,
        callback: Optional[Callable] = None
    ) -> ExecutionResult:
        """执行工作流"""
        pass

    async def build_graph(self, workflow_def: WorkflowDefinition) -> StateGraph:
        """构建LangGraph执行图"""
        pass
```

**NodeExecutor (抽象基类)**

```python
class NodeExecutor(ABC):
    """节点执行器基类"""

    @abstractmethod
    async def execute(
        self,
        node_config: dict,
        context: ExecutionContext
    ) -> NodeResult:
        """执行节点逻辑"""
        pass

    @abstractmethod
    def validate_config(self, config: dict) -> bool:
        """验证节点配置"""
        pass
```

**LLMNodeExecutor**

```python
class LLMNodeExecutor(NodeExecutor):
    """LLM节点执行器"""

    def __init__(self, ollama_service: OllamaService):
        self.ollama = ollama_service

    async def execute(self, node_config: dict, context: ExecutionContext):
        prompt = self._build_prompt(node_config, context)
        response = await self.ollama.generate(
            model=node_config.get('model', 'llama2'),
            prompt=prompt,
            stream=node_config.get('stream', False)
        )
        return NodeResult(output=response, status='success')
```

**OllamaService**

```python
import httpx
from typing import AsyncIterator

class OllamaService:
    """Ollama服务客户端"""

    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(300.0, connect=10.0),
            limits=httpx.Limits(max_keepalive_connections=5)
        )

    async def generate(
        self,
        model: str,
        prompt: str,
        stream: bool = False,
        **kwargs
    ) -> str | AsyncIterator[str]:
        """调用Ollama生成接口"""
        url = f"{self.base_url}/api/generate"
        payload = {"model": model, "prompt": prompt, "stream": stream, **kwargs}

        if stream:
            return self._stream_generate(url, payload)
        else:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            return response.json()["response"]

    async def _stream_generate(self, url: str, payload: dict) -> AsyncIterator[str]:
        """流式生成"""
        async with self.client.stream("POST", url, json=payload) as response:
            async for line in response.aiter_lines():
                if line:
                    data = json.loads(line)
                    yield data.get("response", "")

    async def list_models(self) -> list[str]:
        """获取可用模型列表"""
        response = await self.client.get(f"{self.base_url}/api/tags")
        response.raise_for_status()
        models = response.json().get("models", [])
        return [m["name"] for m in models]

    async def close(self):
        """关闭客户端连接"""
        await self.client.aclose()
```

### 4. API接口设计

#### BFF API端点 (NestJS)

**认证**

```
POST   /api/auth/register             用户注册
POST   /api/auth/login                用户登录
POST   /api/auth/refresh              刷新token
GET    /api/auth/profile              获取用户信息
```

**工作流管理**

```
POST   /api/workflows                 创建工作流
GET    /api/workflows                 获取工作流列表
GET    /api/workflows/:id             获取工作流详情
PUT    /api/workflows/:id             更新工作流
DELETE /api/workflows/:id             删除工作流
POST   /api/workflows/:id/clone       克隆工作流
```

**执行管理**

```
POST   /api/executions                触发执行
GET    /api/executions                获取执行历史
GET    /api/executions/:id            获取执行详情
POST   /api/executions/:id/stop       停止执行
GET    /api/executions/:id/logs       获取执行日志
```

**模型管理**

```
GET    /api/models                    获取可用模型列表
GET    /api/models/:name              获取模型信息
```

#### AI Service API端点 (Python)

**工作流执行**

```
POST   /api/v1/execute                执行工作流
POST   /api/v1/execute/:id/stop       停止执行
GET    /api/v1/execute/:id/status     获取执行状态
```

**模型管理**

```
GET    /api/v1/models                 获取Ollama模型列表
POST   /api/v1/models/pull            拉取新模型
```

#### WebSocket协议 (Socket.io)

**连接端点**: `ws://bff-host/executions`

**事件**:

```typescript
// 客户端 -> 服务端
client.emit('subscribe', executionId)
client.emit('unsubscribe', executionId)

// 服务端 -> 客户端
client.on('status', (data: { executionId: string; status: string }) => {})
client.on('log', (data: { executionId: string; log: any }) => {})
client.on('result', (data: { executionId: string; result: any }) => {})
client.on('error', (data: { executionId: string; error: string }) => {})
```

**前端使用示例**:

```typescript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000/executions', {
  auth: { token: accessToken },
})

socket.emit('subscribe', executionId)

socket.on('status', (data) => {
  console.log('Status:', data.status)
})

socket.on('result', (data) => {
  console.log('Result:', data.result)
})
```

## 数据模型

### 数据库Schema

**workflows表**

```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,  -- 工作流定义(节点、边)
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);
```

**executions表**

```sql
CREATE TABLE executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id),
    status VARCHAR(50) NOT NULL,  -- pending, running, completed, failed
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**execution_logs表**

```sql
CREATE TABLE execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES executions(id),
    node_id VARCHAR(255),
    level VARCHAR(20),  -- info, warning, error
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### TypeScript类型定义

**工作流定义**

```typescript
interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  version: number
}

interface FlowNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: NodeData
}

interface NodeData {
  label: string
  config: Record<string, any>
}

type NodeType = 'input' | 'llm' | 'condition' | 'transform' | 'output' | 'loop' | 'merge'

interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}
```

### Python数据模型

**Pydantic Schemas**

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class NodeConfig(BaseModel):
    """节点配置"""
    type: str
    label: str
    config: Dict[str, Any]

class WorkflowDefinition(BaseModel):
    """工作流定义"""
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class WorkflowCreate(BaseModel):
    """创建工作流请求"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    definition: WorkflowDefinition

class WorkflowResponse(BaseModel):
    """工作流响应"""
    id: str
    name: str
    description: Optional[str]
    definition: WorkflowDefinition
    version: int
    created_at: datetime
    updated_at: datetime

class ExecutionCreate(BaseModel):
    """执行请求"""
    workflow_id: str
    input_data: Dict[str, Any]

class ExecutionResponse(BaseModel):
    """执行响应"""
    id: str
    workflow_id: str
    status: str
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
```

## 错误处理

### 前端错误处理策略

1. **API错误拦截器 (使用Ky)**

```typescript
import ky from 'ky'

const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL,
  hooks: {
    beforeError: [
      async (error) => {
        const { response } = error
        if (response?.status === 401) {
          // 跳转登录
          router.push('/login')
        } else if (response?.status === 500) {
          // 显示错误提示
          toast.error('服务器错误')
        }
        return error
      },
    ],
  },
})
```

2. **全局错误边界**

- 使用Vue的errorHandler捕获组件错误
- 显示友好的错误页面

3. **工作流验证**

- 保存前验证节点配置完整性
- 检查边连接的有效性
- 检测循环依赖

### 后端错误处理

1. **自定义异常类**

```python
class WorkflowException(Exception):
    """工作流异常基类"""
    pass

class NodeExecutionError(WorkflowException):
    """节点执行错误"""
    pass

class ValidationError(WorkflowException):
    """验证错误"""
    pass
```

2. **全局异常处理器**

```python
@app.exception_handler(WorkflowException)
async def workflow_exception_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"error": str(exc), "type": exc.__class__.__name__}
    )
```

3. **执行错误恢复**

- 节点执行失败时记录错误状态
- 支持从失败节点重试
- 提供回滚机制

## 测试策略

### 前端测试

**单元测试 (Vitest)**

- 组件测试：使用@vue/test-utils
- Store测试：测试Pinia actions和getters
- 工具函数测试：纯函数逻辑测试

**集成测试**

- API mock测试
- 路由导航测试
- 工作流编辑流程测试

**E2E测试 (可选)**

- 使用Playwright或Cypress
- 测试完整用户流程

### 后端测试

**单元测试 (pytest)**

```python
@pytest.mark.asyncio
async def test_llm_node_executor():
    ollama_service = Mock(OllamaService)
    executor = LLMNodeExecutor(ollama_service)

    result = await executor.execute(
        node_config={'model': 'llama2', 'prompt': 'test'},
        context=ExecutionContext()
    )

    assert result.status == 'success'
```

**集成测试**

- 测试API端点
- 测试数据库操作
- 测试WebSocket连接

**工作流测试**

- 测试简单线性工作流
- 测试条件分支工作流
- 测试循环工作流

## 部署架构

### Docker容器化

**docker-compose.yml**

```yaml
version: '3.8'

services:
  # 前端服务
  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
    ports:
      - '3000:80'
    depends_on:
      - bff
    environment:
      - VITE_BFF_URL=http://bff:3001
    networks:
      - app-network

  # BFF服务
  bff:
    build:
      context: .
      dockerfile: docker/bff.Dockerfile
    ports:
      - '3001:3001'
    depends_on:
      - postgres
      - redis
      - ai-service
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/workflow
      - REDIS_URL=redis://redis:6379
      - AI_SERVICE_URL=http://ai-service:8000
      - JWT_SECRET=your-secret-key
      - NODE_ENV=production
    networks:
      - app-network

  # AI服务
  ai-service:
    build:
      context: .
      dockerfile: docker/ai-service.Dockerfile
    ports:
      - '8000:8000'
    depends_on:
      - redis
      - ollama
    environment:
      - REDIS_URL=redis://redis:6379
      - OLLAMA_URL=http://ollama:11434
      - LOG_LEVEL=info
    networks:
      - app-network

  # PostgreSQL数据库
  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=workflow
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    ports:
      - '5432:5432'
    networks:
      - app-network
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U user']
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis缓存
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - '6379:6379'
    networks:
      - app-network
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5

  # Ollama LLM服务
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - '11434:11434'
    networks:
      - app-network
    # 如果有GPU，取消注释
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]

  # Nginx反向代理（可选）
  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend
      - bff
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:
  ollama_data:

networks:
  app-network:
    driver: bridge
```

**开发环境 docker-compose.dev.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      - POSTGRES_DB=workflow
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  ollama:
    image: ollama/ollama:latest
    ports:
      - '11434:11434'
    volumes:
      - ollama_dev_data:/root/.ollama

volumes:
  postgres_dev_data:
  ollama_dev_data:
```

### 生产环境考虑

1. **负载均衡**: 使用Nginx或Traefik
2. **数据库**: PostgreSQL主从复制
3. **缓存**: Redis集群
4. **监控**: Prometheus + Grafana
5. **日志**: ELK Stack或Loki
6. **备份**: 定期数据库备份
7. **SSL**: Let's Encrypt证书

### 当前架构 (BFF模式)

```mermaid
graph TB
    A[Vue3 Frontend] --> B[NestJS BFF]
    B --> C[Python AI Service]
    B --> D[(PostgreSQL)]
    B --> E[(Redis)]
    C --> E
    C --> F[Ollama]
```

**架构优势:**

1. **全栈TypeScript统一**
   - 前端和BFF完全共享类型定义
   - 端到端类型安全
   - 减少类型转换错误

2. **关注点分离**
   - BFF: 业务逻辑、认证、数据库
   - AI Service: 专注AI工作流执行
   - 各服务职责清晰

3. **开发体验优秀**
   - 统一的工具链和开发模式
   - 共享代码包复用
   - 类型提示和自动补全

4. **易于扩展**
   - 未来支持移动端/桌面端只需对接BFF
   - AI Service可独立扩展和优化
   - 便于添加新的微服务

**服务职责划分:**

**NestJS BFF:**

- ✅ 用户认证和授权 (JWT)
- ✅ 工作流CRUD操作
- ✅ 数据库访问 (Prisma + PostgreSQL)
- ✅ WebSocket实时通信
- ✅ API聚合和转换
- ✅ 缓存管理 (Redis)
- ✅ 请求验证和错误处理

**Python AI Service:**

- ✅ LangGraph工作流引擎
- ✅ AI节点执行器
- ✅ Ollama模型调用
- ✅ 工作流执行状态管理
- ✅ 流式响应处理

### 未来扩展路径

**阶段1: 当前 (MVP)**

- BFF + AI Service架构
- 支持Web端
- 核心功能完善

**阶段2: 多端支持 (6个月后)**

```mermaid
graph TB
    A[Vue3 Web] --> D[NestJS BFF]
    B[Mobile App] --> D
    C[Desktop App] --> D
    D --> E[Python AI Service]
    D --> F[(PostgreSQL)]
    E --> G[Ollama]
```

- 移动端App对接BFF
- 桌面端Electron应用
- BFF提供统一API

**阶段3: 微服务化 (12个月后)**

```mermaid
graph TB
    A[Clients] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[Workflow Service]
    B --> E[Execution Service]
    B --> F[AI Service]
    D --> G[(PostgreSQL)]
    E --> G
    F --> H[Ollama]
    F --> I[Vector DB]
```

- 服务进一步拆分
- 引入API Gateway
- 支持更复杂的AI功能（RAG、Multi-Agent）

### 架构决策记录

**为什么现在就采用BFF？**

1. **类型安全优先**: 全栈TypeScript避免大量类型转换问题
2. **团队效率**: 前端开发者可以参与BFF开发
3. **未来准备**: 为多端支持打好基础
4. **最佳实践**: BFF是现代Web应用的标准架构
5. **开发体验**: 统一的工具链和代码风格

**权衡考虑:**

- ✅ 优势: 类型安全、开发体验、可扩展性
- ⚠️ 劣势: 多一层服务、略微增加复杂度
- 💡 结论: 长期收益大于短期成本

## 性能优化

### 前端优化

1. **代码分割**: 路由懒加载
2. **虚拟滚动**: 大量节点时使用虚拟列表
3. **防抖节流**: 编辑器操作防抖
4. **缓存策略**: API响应缓存
5. **资源优化**: 图片压缩、CDN加速

### 后端优化

1. **数据库索引**: 为常用查询字段添加索引
2. **连接池**: 数据库和Redis连接池
3. **异步处理**: 使用asyncio提高并发
4. **缓存**: Redis缓存工作流定义
5. **批处理**: 批量数据库操作

## 安全考虑

1. **认证授权**: JWT token + RBAC
2. **输入验证**: Pydantic和Zod双重验证
3. **SQL注入防护**: 使用ORM参数化查询
4. **XSS防护**: 前端输出转义
5. **CSRF防护**: CSRF token
6. **速率限制**: API请求限流
7. **敏感数据**: 环境变量管理，不提交到代码库

## 扩展性设计

### 1. 插件系统设计

#### 插件架构

```mermaid
graph TB
    A[Plugin Registry] --> B[Node Plugin]
    A --> C[UI Component Plugin]
    A --> D[Executor Plugin]

    B --> E[Plugin Manifest]
    B --> F[Node Definition]
    B --> G[Validation Schema]

    C --> H[Vue Component]
    C --> I[Config Form]

    D --> J[Python Executor]
    D --> K[Dependencies]
```

#### 插件规范

**插件目录结构:**

```
my-custom-node-plugin/
├── package.json           # 插件元数据
├── plugin.manifest.json   # 插件清单
├── frontend/              # 前端部分
│   ├── NodeComponent.vue  # 节点UI组件
│   ├── ConfigPanel.vue    # 配置面板
│   └── index.ts           # 导出
├── backend/               # 后端部分
│   ├── executor.py        # 节点执行器
│   ├── schema.py          # 验证schema
│   └── requirements.txt   # Python依赖
└── README.md
```

**plugin.manifest.json:**

```json
{
  "id": "custom-http-request",
  "name": "HTTP Request Node",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Make HTTP requests in workflows",
  "category": "integration",
  "icon": "globe",
  "frontend": {
    "component": "./frontend/NodeComponent.vue",
    "configPanel": "./frontend/ConfigPanel.vue"
  },
  "backend": {
    "executor": "./backend/executor.py",
    "entrypoint": "HttpRequestExecutor"
  },
  "config": {
    "schema": {
      "type": "object",
      "properties": {
        "url": { "type": "string", "format": "uri" },
        "method": { "type": "string", "enum": ["GET", "POST", "PUT", "DELETE"] },
        "headers": { "type": "object" },
        "body": { "type": "string" }
      },
      "required": ["url", "method"]
    }
  },
  "permissions": ["network.http"],
  "dependencies": {
    "python": ["httpx>=0.25.0"],
    "npm": ["axios@^1.6.0"]
  }
}
```

#### 插件注册机制

**前端插件注册:**

```typescript
// apps/frontend/src/plugins/plugin-manager.ts
import type { NodePlugin } from '@workflow/shared-types'

class PluginManager {
  private plugins = new Map<string, NodePlugin>()

  async registerPlugin(pluginId: string, pluginPath: string) {
    // 动态加载插件
    const plugin = await import(/* @vite-ignore */ pluginPath)

    // 验证插件manifest
    const manifest = await this.validateManifest(plugin.manifest)

    // 注册节点类型
    this.plugins.set(pluginId, {
      id: manifest.id,
      component: plugin.NodeComponent,
      configPanel: plugin.ConfigPanel,
      manifest,
    })

    // 通知BFF注册后端执行器
    await api.post('/api/plugins/register', { pluginId, manifest })
  }

  getPlugin(pluginId: string): NodePlugin | undefined {
    return this.plugins.get(pluginId)
  }

  getAllPlugins(): NodePlugin[] {
    return Array.from(this.plugins.values())
  }
}

export const pluginManager = new PluginManager()
```

**后端插件注册 (BFF):**

```typescript
// apps/bff/src/plugins/plugins.service.ts
@Injectable()
export class PluginsService {
  private plugins = new Map<string, PluginManifest>()

  async registerPlugin(manifest: PluginManifest) {
    // 验证插件
    await this.validatePlugin(manifest)

    // 存储插件信息
    await this.prisma.plugin.create({
      data: {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        manifest: manifest as any,
        isActive: true,
      },
    })

    // 通知AI Service注册执行器
    await this.aiServiceClient.registerExecutor({
      pluginId: manifest.id,
      executorPath: manifest.backend.executor,
      entrypoint: manifest.backend.entrypoint,
    })

    this.plugins.set(manifest.id, manifest)
  }

  async installPlugin(pluginPackage: string) {
    // 从npm/PyPI安装插件
    // 解析manifest
    // 注册插件
  }
}
```

**Python执行器注册:**

```python
# apps/ai-service/app/plugins/plugin_registry.py
from typing import Dict, Type
from app.engine.nodes.base import NodeExecutor

class PluginRegistry:
    def __init__(self):
        self._executors: Dict[str, Type[NodeExecutor]] = {}

    def register_executor(
        self,
        plugin_id: str,
        executor_class: Type[NodeExecutor]
    ):
        """注册插件执行器"""
        self._executors[plugin_id] = executor_class
        logger.info(f"Registered executor for plugin: {plugin_id}")

    def get_executor(self, plugin_id: str) -> Type[NodeExecutor]:
        """获取执行器"""
        if plugin_id not in self._executors:
            raise ValueError(f"Executor not found for plugin: {plugin_id}")
        return self._executors[plugin_id]

    async def load_plugin(self, plugin_id: str, executor_path: str, entrypoint: str):
        """动态加载插件"""
        import importlib.util

        # 加载Python模块
        spec = importlib.util.spec_from_file_location(plugin_id, executor_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        # 获取执行器类
        executor_class = getattr(module, entrypoint)

        # 注册
        self.register_executor(plugin_id, executor_class)

plugin_registry = PluginRegistry()
```

#### 插件开发模板

**CLI工具创建插件:**

```bash
# 安装CLI工具
npm install -g @workflow/plugin-cli

# 创建插件项目
workflow-plugin create my-http-node

# 生成的项目结构
my-http-node/
├── package.json
├── plugin.manifest.json
├── frontend/
│   ├── NodeComponent.vue      # 节点UI模板
│   ├── ConfigPanel.vue         # 配置面板模板
│   └── index.ts
├── backend/
│   ├── executor.py             # 执行器模板
│   ├── schema.py               # 验证schema
│   └── requirements.txt
├── tests/
│   ├── frontend.spec.ts
│   └── backend.test.py
└── README.md
```

**前端组件模板:**

```vue
<!-- frontend/NodeComponent.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@workflow/shared-types'

const props = defineProps<NodeProps>()

const config = computed(() => props.data.config)
</script>

<template>
  <div class="custom-node">
    <div class="node-header">
      <Icon :name="props.data.icon" />
      <span>{{ props.data.label }}</span>
    </div>
    <div class="node-body">
      <!-- 自定义节点内容 -->
      <div class="config-preview">
        <span>{{ config.url }}</span>
      </div>
    </div>
    <Handle type="target" position="left" />
    <Handle type="source" position="right" />
  </div>
</template>
```

**后端执行器模板:**

```python
# backend/executor.py
from app.engine.nodes.base import NodeExecutor, NodeResult, ExecutionContext
from pydantic import BaseModel, HttpUrl
from typing import Literal
import httpx

class HttpRequestConfig(BaseModel):
    """HTTP请求配置"""
    url: HttpUrl
    method: Literal["GET", "POST", "PUT", "DELETE"]
    headers: dict = {}
    body: str = ""

class HttpRequestExecutor(NodeExecutor):
    """HTTP请求节点执行器"""

    async def execute(
        self,
        node_config: dict,
        context: ExecutionContext
    ) -> NodeResult:
        # 验证配置
        config = HttpRequestConfig(**node_config)

        # 执行HTTP请求
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=config.method,
                url=str(config.url),
                headers=config.headers,
                content=config.body
            )

        return NodeResult(
            output={
                "status": response.status_code,
                "body": response.text,
                "headers": dict(response.headers)
            },
            status="success"
        )

    def validate_config(self, config: dict) -> bool:
        try:
            HttpRequestConfig(**config)
            return True
        except Exception:
            return False
```

#### 插件打包与上传

**打包脚本:**

```bash
# package.json scripts
{
  "scripts": {
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "vite build",
    "build:backend": "python -m build",
    "package": "workflow-plugin pack",
    "publish": "workflow-plugin publish"
  }
}
```

**打包格式 (.wfplugin):**

```
my-http-node-1.0.0.wfplugin (tar.gz)
├── manifest.json
├── frontend/
│   ├── index.js
│   └── style.css
├── backend/
│   ├── executor.py
│   └── requirements.txt
├── signature.json          # 数字签名
└── README.md
```

#### 插件上传与存储

**文件存储服务 (MinIO):**

```typescript
// apps/bff/src/plugins/storage.service.ts
import { Injectable } from '@nestjs/common'
import * as Minio from 'minio'

@Injectable()
export class PluginStorageService {
  private minioClient: Minio.Client

  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT,
      port: 9000,
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    })
  }

  async uploadPlugin(tenantId: string, pluginId: string, file: Buffer): Promise<string> {
    const bucketName = `tenant-${tenantId}-plugins`
    const objectName = `${pluginId}/${Date.now()}.wfplugin`

    // 确保bucket存在
    const exists = await this.minioClient.bucketExists(bucketName)
    if (!exists) {
      await this.minioClient.makeBucket(bucketName)
    }

    // 上传文件
    await this.minioClient.putObject(bucketName, objectName, file, file.length)

    return objectName
  }

  async downloadPlugin(tenantId: string, objectName: string): Promise<Buffer> {
    const bucketName = `tenant-${tenantId}-plugins`
    const stream = await this.minioClient.getObject(bucketName, objectName)

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', reject)
    })
  }
}
```

**插件上传API:**

```typescript
// apps/bff/src/plugins/plugins.controller.ts
@Controller('plugins')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PluginsController {
  constructor(
    private pluginsService: PluginsService,
    private storageService: PluginStorageService
  ) {}

  @Post('upload')
  @Permissions(Permission.PLUGIN_INSTALL)
  @UseInterceptors(FileInterceptor('file'))
  async uploadPlugin(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    // 1. 验证文件格式
    if (!file.originalname.endsWith('.wfplugin')) {
      throw new BadRequestException('Invalid plugin file')
    }

    // 2. 解压并验证manifest
    const manifest = await this.pluginsService.extractManifest(file.buffer)

    // 3. 验证签名
    await this.pluginsService.verifySignature(file.buffer, manifest)

    // 4. 检查权限
    await this.pluginsService.checkPermissions(manifest, user)

    // 5. 上传到MinIO
    const objectName = await this.storageService.uploadPlugin(
      user.tenantId,
      manifest.id,
      file.buffer
    )

    // 6. 注册插件
    await this.pluginsService.registerPlugin(user.tenantId, manifest, objectName)

    return { success: true, pluginId: manifest.id }
  }

  @Post(':id/install')
  @Permissions(Permission.PLUGIN_INSTALL)
  async installPlugin(@Param('id') pluginId: string, @CurrentUser() user: User) {
    // 1. 从MinIO下载插件
    const plugin = await this.pluginsService.getPlugin(user.tenantId, pluginId)
    const file = await this.storageService.downloadPlugin(user.tenantId, plugin.objectName)

    // 2. 解压插件
    const extracted = await this.pluginsService.extractPlugin(file)

    // 3. 安装前端部分
    await this.pluginsService.installFrontend(extracted.frontend)

    // 4. 通知AI Service安装后端部分
    await this.aiServiceClient.installPlugin({
      pluginId,
      executor: extracted.backend.executor,
      requirements: extracted.backend.requirements,
    })

    // 5. 更新插件状态
    await this.pluginsService.activatePlugin(user.tenantId, pluginId)

    return { success: true }
  }
}
```

**前端插件加载器:**

```typescript
// apps/frontend/src/plugins/plugin-loader.ts
import { defineAsyncComponent } from 'vue'
import type { NodePlugin } from '@workflow/shared-types'

export class PluginLoader {
  private loadedPlugins = new Map<string, NodePlugin>()

  async loadPlugin(pluginId: string): Promise<NodePlugin> {
    if (this.loadedPlugins.has(pluginId)) {
      return this.loadedPlugins.get(pluginId)!
    }

    // 从BFF获取插件信息
    const pluginInfo = await api.get(`/api/plugins/${pluginId}`)

    // 动态加载前端组件
    const NodeComponent = defineAsyncComponent(
      () => import(/* @vite-ignore */ pluginInfo.frontendUrl)
    )

    const ConfigPanel = defineAsyncComponent(
      () => import(/* @vite-ignore */ pluginInfo.configPanelUrl)
    )

    const plugin: NodePlugin = {
      id: pluginId,
      manifest: pluginInfo.manifest,
      NodeComponent,
      ConfigPanel,
    }

    this.loadedPlugins.set(pluginId, plugin)
    return plugin
  }

  async loadAllPlugins(): Promise<void> {
    const plugins = await api.get('/api/plugins')
    await Promise.all(plugins.map((p) => this.loadPlugin(p.id)))
  }
}

export const pluginLoader = new PluginLoader()
```

**Python插件安装:**

```python
# apps/ai-service/app/plugins/installer.py
import tarfile
import subprocess
from pathlib import Path

class PluginInstaller:
    def __init__(self, plugins_dir: Path):
        self.plugins_dir = plugins_dir

    async def install_plugin(
        self,
        plugin_id: str,
        plugin_file: bytes
    ):
        """安装插件"""
        # 1. 创建插件目录
        plugin_path = self.plugins_dir / plugin_id
        plugin_path.mkdir(parents=True, exist_ok=True)

        # 2. 解压插件
        with tarfile.open(fileobj=io.BytesIO(plugin_file)) as tar:
            tar.extractall(plugin_path)

        # 3. 安装Python依赖
        requirements_file = plugin_path / "backend" / "requirements.txt"
        if requirements_file.exists():
            subprocess.run([
                "pip", "install", "-r", str(requirements_file)
            ], check=True)

        # 4. 加载执行器
        executor_file = plugin_path / "backend" / "executor.py"
        manifest_file = plugin_path / "manifest.json"

        with open(manifest_file) as f:
            manifest = json.load(f)

        await plugin_registry.load_plugin(
            plugin_id,
            str(executor_file),
            manifest["backend"]["entrypoint"]
        )

        logger.info(f"Plugin {plugin_id} installed successfully")
```

### 2. 多租户与权限设计

#### 多租户架构

**数据隔离策略:**

```prisma
// Prisma Schema with multi-tenancy
model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  plan      String   // free, pro, enterprise
  createdAt DateTime @default(now())

  users      User[]
  workflows  Workflow[]
  executions Execution[]
}

model User {
  id       String @id @default(uuid())
  email    String @unique
  role     Role   // admin, editor, viewer

  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}

model Workflow {
  id         String @id @default(uuid())
  name       String
  definition Json

  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id])

  userId   String
  user     User   @relation(fields: [userId], references: [id])

  permissions WorkflowPermission[]

  @@index([tenantId])
  @@index([userId])
}

model WorkflowPermission {
  id         String @id @default(uuid())
  workflowId String
  workflow   Workflow @relation(fields: [workflowId], references: [id])

  userId     String
  user       User   @relation(fields: [userId], references: [id])

  canView    Boolean @default(true)
  canEdit    Boolean @default(false)
  canExecute Boolean @default(false)
  canDelete  Boolean @default(false)

  @@unique([workflowId, userId])
}
```

**租户管理模块:**

```typescript
// apps/bff/src/tenants/tenants.service.ts
@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async createTenant(dto: CreateTenantDto): Promise<Tenant> {
    // 创建租户
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        plan: dto.plan || 'free',
      },
    })

    // 创建租户管理员
    const admin = await this.prisma.user.create({
      data: {
        email: dto.adminEmail,
        password: await bcrypt.hash(dto.adminPassword, 10),
        role: Role.TENANT_ADMIN,
        tenantId: tenant.id,
      },
    })

    // 初始化租户资源
    await this.initializeTenantResources(tenant.id)

    return tenant
  }

  private async initializeTenantResources(tenantId: string) {
    // 创建MinIO bucket
    await this.minioClient.makeBucket(`tenant-${tenantId}-plugins`)
    await this.minioClient.makeBucket(`tenant-${tenantId}-files`)

    // 初始化Redis命名空间
    await this.redis.set(`tenant:${tenantId}:initialized`, '1')

    // 创建默认工作流模板
    await this.createDefaultWorkflows(tenantId)
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: true,
        _count: {
          select: {
            workflows: true,
            executions: true,
          },
        },
      },
    })
  }

  async updateTenant(tenantId: string, dto: UpdateTenantDto): Promise<Tenant> {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    })
  }

  async deleteTenant(tenantId: string): Promise<void> {
    // 软删除租户
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { deletedAt: new Date() },
    })

    // 清理资源
    await this.cleanupTenantResources(tenantId)
  }

  private async cleanupTenantResources(tenantId: string) {
    // 删除MinIO buckets
    await this.minioClient.removeBucket(`tenant-${tenantId}-plugins`)
    await this.minioClient.removeBucket(`tenant-${tenantId}-files`)

    // 清理Redis数据
    const keys = await this.redis.keys(`tenant:${tenantId}:*`)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
}

// apps/bff/src/tenants/tenants.controller.ts
@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Post()
  @Permissions(Permission.TENANT_CREATE)
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.createTenant(dto)
  }

  @Get(':id')
  @UseGuards(TenantAccessGuard)
  async findOne(@Param('id') id: string) {
    return this.tenantsService.getTenant(id)
  }

  @Put(':id')
  @UseGuards(TenantAdminGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.updateTenant(id, dto)
  }

  @Delete(':id')
  @Permissions(Permission.TENANT_DELETE)
  async remove(@Param('id') id: string) {
    return this.tenantsService.deleteTenant(id)
  }

  @Get(':id/usage')
  @UseGuards(TenantAdminGuard)
  async getUsage(@Param('id') id: string) {
    return this.tenantsService.getTenantUsage(id)
  }
}
```

**租户隔离中间件:**

```typescript
// apps/bff/src/common/middleware/tenant.middleware.ts
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private tenantsService: TenantsService
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // 从JWT或subdomain提取租户ID
      const tenantId = await this.extractTenantId(req)

      // 验证租户是否存在且激活
      const tenant = await this.tenantsService.getTenant(tenantId)
      if (!tenant || tenant.deletedAt) {
        throw new UnauthorizedException('Invalid tenant')
      }

      // 注入到请求上下文
      req['tenantId'] = tenantId
      req['tenant'] = tenant

      next()
    } catch (error) {
      next(error)
    }
  }

  private async extractTenantId(req: Request): Promise<string> {
    // 方案1: 从subdomain提取 (tenant1.app.com)
    const subdomain = req.hostname.split('.')[0]
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      const tenant = await this.tenantsService.findBySlug(subdomain)
      if (tenant) return tenant.id
    }

    // 方案2: 从JWT token提取
    const token = req.headers.authorization?.split(' ')[1]
    if (token) {
      const decoded = this.jwtService.decode(token) as any
      if (decoded?.tenantId) return decoded.tenantId
    }

    // 方案3: 从header提取
    const headerTenantId = req.headers['x-tenant-id'] as string
    if (headerTenantId) return headerTenantId

    throw new UnauthorizedException('Tenant ID not found')
  }
}

// 应用中间件
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET }
      )
      .forRoutes('*')
  }
}
```

**租户访问Guard:**

```typescript
// apps/bff/src/common/guards/tenant-access.guard.ts
@Injectable()
export class TenantAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const tenantId = request.tenantId

    // 验证用户是否属于该租户
    if (user.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this tenant')
    }

    return true
  }
}

@Injectable()
export class TenantAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const tenantId = request.params.id || request.tenantId

    // 验证用户是否是租户管理员
    if (user.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied')
    }

    if (user.role !== Role.TENANT_ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Tenant admin access required')
    }

    return true
  }
}
```

**Redis缓存隔离:**

```typescript
// 使用租户前缀隔离缓存
const cacheKey = `tenant:${tenantId}:workflow:${workflowId}`
await redis.set(cacheKey, data)
```

**Prisma自动租户过滤:**

```typescript
// apps/bff/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, Scope } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { REQUEST } from '@nestjs/core'
import { Inject } from '@nestjs/common'

@Injectable({ scope: Scope.REQUEST })
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(@Inject(REQUEST) private readonly request: any) {
    super()

    // 添加租户过滤中间件
    this.$use(async (params, next) => {
      const tenantId = this.request.tenantId

      // 需要租户过滤的模型
      const tenantModels = ['Workflow', 'Execution', 'User', 'Plugin']

      if (tenantModels.includes(params.model)) {
        // 查询操作自动添加租户过滤
        if (params.action === 'findMany' || params.action === 'findFirst') {
          params.args.where = {
            ...params.args.where,
            tenantId,
          }
        }

        // 创建操作自动添加租户ID
        if (params.action === 'create') {
          params.args.data = {
            ...params.args.data,
            tenantId,
          }
        }

        // 更新/删除操作验证租户
        if (params.action === 'update' || params.action === 'delete') {
          params.args.where = {
            ...params.args.where,
            tenantId,
          }
        }
      }

      return next(params)
    })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async enableShutdownHooks(app: any) {
    this.$on('beforeExit', async () => {
      await app.close()
    })
  }
}
```

**扩展的权限Guard:**

```typescript
// apps/bff/src/common/guards/permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Permission, Role } from '@workflow/shared-types'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredPermissions) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user
    const tenantId = request.tenantId

    // 超级管理员拥有所有权限
    if (user.role === Role.SUPER_ADMIN) {
      return true
    }

    // 验证租户归属
    if (user.tenantId !== tenantId) {
      return false
    }

    // 获取用户权限
    const userPermissions = await this.getUserPermissions(user.id)

    // 检查是否拥有所需权限
    return requiredPermissions.every((permission) => userPermissions.includes(permission))
  }

  private async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    })

    return user.role.permissions.map((p) => p.name as Permission)
  }
}

// 资源所有权Guard
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const resourceId = request.params.id
    const resourceType = this.getResourceType(context)

    // 超级管理员和租户管理员可以访问所有资源
    if (user.role === Role.SUPER_ADMIN || user.role === Role.TENANT_ADMIN) {
      return true
    }

    // 检查资源所有权
    const resource = await this.getResource(resourceType, resourceId)

    if (!resource) {
      return false
    }

    // 验证用户是否是资源所有者或有权限访问
    if (resource.userId === user.id) {
      return true
    }

    // 检查共享权限
    const hasPermission = await this.checkSharedPermission(resourceType, resourceId, user.id)

    return hasPermission
  }

  private getResourceType(context: ExecutionContext): string {
    const controller = context.getClass().name
    return controller.replace('Controller', '').toLowerCase()
  }

  private async getResource(type: string, id: string) {
    switch (type) {
      case 'workflows':
        return this.prisma.workflow.findUnique({ where: { id } })
      case 'executions':
        return this.prisma.execution.findUnique({ where: { id } })
      default:
        return null
    }
  }

  private async checkSharedPermission(
    type: string,
    resourceId: string,
    userId: string
  ): Promise<boolean> {
    if (type === 'workflows') {
      const permission = await this.prisma.workflowPermission.findUnique({
        where: {
          workflowId_userId: {
            workflowId: resourceId,
            userId,
          },
        },
      })
      return permission?.canView || false
    }
    return false
  }
}

// 使用示例
@Controller('workflows')
export class WorkflowsController {
  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, ResourceOwnerGuard)
  @Permissions(Permission.WORKFLOW_READ)
  async findOne(@Param('id') id: string) {
    return this.workflowsService.findOne(id)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, ResourceOwnerGuard)
  @Permissions(Permission.WORKFLOW_UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflowsService.update(id, dto)
  }
}
```

**角色权限数据表:**

```prisma
// 扩展Prisma schema
model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  tenantId    String?
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])

  permissions RolePermission[]
  users       User[]

  @@index([tenantId])
}

model RolePermission {
  id           String @id @default(uuid())
  roleId       String
  role         Role   @relation(fields: [roleId], references: [id])
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@unique([roleId, permissionId])
}

model Permission {
  id          String @id @default(uuid())
  name        String @unique  // 如 'workflow:create'
  description String?
  category    String          // 如 'workflow', 'execution', 'plugin'

  roles RolePermission[]
}

// 用户表添加角色关联
model User {
  id       String @id @default(uuid())
  email    String @unique
  password String
  roleId   String
  role     Role   @relation(fields: [roleId], references: [id])
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@index([roleId])
}
```

#### 细粒度权限控制

**RBAC + ABAC混合模型:**

```typescript
// 角色定义
enum Role {
  SUPER_ADMIN = 'super_admin', // 平台管理员
  TENANT_ADMIN = 'tenant_admin', // 租户管理员
  WORKFLOW_ADMIN = 'workflow_admin', // 工作流管理员
  EDITOR = 'editor', // 编辑者
  VIEWER = 'viewer', // 查看者
}

// 权限定义
enum Permission {
  // 工作流权限
  WORKFLOW_CREATE = 'workflow:create',
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_UPDATE = 'workflow:update',
  WORKFLOW_DELETE = 'workflow:delete',
  WORKFLOW_EXECUTE = 'workflow:execute',

  // 节点权限
  NODE_USE_LLM = 'node:use:llm',
  NODE_USE_HTTP = 'node:use:http',
  NODE_USE_DATABASE = 'node:use:database',

  // 执行权限
  EXECUTION_VIEW = 'execution:view',
  EXECUTION_STOP = 'execution:stop',

  // 插件权限
  PLUGIN_INSTALL = 'plugin:install',
  PLUGIN_MANAGE = 'plugin:manage',
}

// 权限检查装饰器
@Injectable()
export class PermissionsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const requiredPermissions = this.reflector.get<Permission[]>(
      'permissions',
      context.getHandler()
    )

    return this.checkPermissions(user, requiredPermissions)
  }

  private checkPermissions(user: User, permissions: Permission[]): boolean {
    // 检查用户角色和权限
    const userPermissions = this.getUserPermissions(user)
    return permissions.every((p) => userPermissions.includes(p))
  }
}

// 使用示例
@Controller('workflows')
export class WorkflowsController {
  @Post()
  @Permissions(Permission.WORKFLOW_CREATE)
  @UseGuards(PermissionsGuard)
  async create(@Body() dto: CreateWorkflowDto) {
    // ...
  }

  @Get(':id')
  @Permissions(Permission.WORKFLOW_READ)
  @UseGuards(PermissionsGuard, ResourceOwnerGuard)
  async findOne(@Param('id') id: string) {
    // ...
  }
}
```

**节点级权限控制:**

```typescript
// 工作流验证时检查节点权限
async validateWorkflowPermissions(
  workflow: WorkflowDefinition,
  user: User
): Promise<void> {
  for (const node of workflow.nodes) {
    const permission = `node:use:${node.type}`

    if (!user.permissions.includes(permission)) {
      throw new ForbiddenException(
        `You don't have permission to use ${node.type} nodes`
      )
    }
  }
}
```

### 3. 监控与可观测性

#### 核心监控指标

**业务指标:**

```typescript
// Prometheus metrics
import { Counter, Histogram, Gauge } from 'prom-client'

// 工作流执行指标
export const workflowExecutionTotal = new Counter({
  name: 'workflow_execution_total',
  help: 'Total number of workflow executions',
  labelNames: ['tenant_id', 'workflow_id', 'status'],
})

export const workflowExecutionDuration = new Histogram({
  name: 'workflow_execution_duration_seconds',
  help: 'Workflow execution duration in seconds',
  labelNames: ['tenant_id', 'workflow_id'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
})

// 节点执行指标
export const nodeExecutionTotal = new Counter({
  name: 'node_execution_total',
  help: 'Total number of node executions',
  labelNames: ['node_type', 'status'],
})

export const nodeExecutionDuration = new Histogram({
  name: 'node_execution_duration_seconds',
  help: 'Node execution duration in seconds',
  labelNames: ['node_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
})

// LLM调用指标
export const llmCallTotal = new Counter({
  name: 'llm_call_total',
  help: 'Total number of LLM calls',
  labelNames: ['model', 'status'],
})

export const llmCallDuration = new Histogram({
  name: 'llm_call_duration_seconds',
  help: 'LLM call duration in seconds',
  labelNames: ['model'],
  buckets: [1, 3, 5, 10, 20, 30, 60],
})

export const llmTokensUsed = new Counter({
  name: 'llm_tokens_used_total',
  help: 'Total tokens used by LLM',
  labelNames: ['model', 'type'], // type: prompt, completion
})

// 系统指标
export const activeExecutions = new Gauge({
  name: 'active_executions',
  help: 'Number of currently active executions',
})

export const queuedExecutions = new Gauge({
  name: 'queued_executions',
  help: 'Number of queued executions',
})
```

**使用示例:**

```typescript
// 记录工作流执行
async executeWorkflow(workflowId: string, tenantId: string) {
  const timer = workflowExecutionDuration.startTimer({ tenant_id: tenantId, workflow_id: workflowId })
  activeExecutions.inc()

  try {
    const result = await this.doExecute(workflowId)
    workflowExecutionTotal.inc({ tenant_id: tenantId, workflow_id: workflowId, status: 'success' })
    return result
  } catch (error) {
    workflowExecutionTotal.inc({ tenant_id: tenantId, workflow_id: workflowId, status: 'failed' })
    throw error
  } finally {
    timer()
    activeExecutions.dec()
  }
}
```

#### 分布式追踪 (OpenTelemetry)

**配置OpenTelemetry:**

```typescript
// apps/bff/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { JaegerExporter } from '@opentelemetry/exporter-jaeger'

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
    }),
  ],
})

sdk.start()
```

**Python服务追踪:**

```python
# apps/ai-service/app/tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# 配置tracer
trace.set_tracer_provider(TracerProvider())
jaeger_exporter = JaegerExporter(
    agent_host_name="jaeger",
    agent_port=6831,
)
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

# 自动instrument FastAPI
FastAPIInstrumentor.instrument_app(app)

# 手动添加span
tracer = trace.get_tracer(__name__)

async def execute_node(node_id: str, config: dict):
    with tracer.start_as_current_span("execute_node") as span:
        span.set_attribute("node.id", node_id)
        span.set_attribute("node.type", config.get("type"))

        # 执行节点逻辑
        result = await do_execute(node_id, config)

        span.set_attribute("node.status", "success")
        return result
```

**跨服务追踪:**

```typescript
// BFF调用AI Service时传递trace context
import { context, propagation } from '@opentelemetry/api'

async function callAiService(payload: any) {
  const headers = {}

  // 注入trace context到HTTP headers
  propagation.inject(context.active(), headers)

  return axios.post('http://ai-service:8000/api/v1/execute', payload, {
    headers,
  })
}
```

#### Grafana Dashboard

**预定义Dashboard:**

```json
{
  "dashboard": {
    "title": "AI Workflow Platform",
    "panels": [
      {
        "title": "Workflow Execution Rate",
        "targets": [
          {
            "expr": "rate(workflow_execution_total[5m])"
          }
        ]
      },
      {
        "title": "Average Execution Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, workflow_execution_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Node Failure Rate",
        "targets": [
          {
            "expr": "rate(node_execution_total{status=\"failed\"}[5m])"
          }
        ]
      },
      {
        "title": "LLM Call Latency (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, llm_call_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Active Executions",
        "targets": [
          {
            "expr": "active_executions"
          }
        ]
      }
    ]
  }
}
```

#### 日志聚合

**结构化日志:**

```typescript
// 使用Winston + ELK
import winston from 'winston'

const logger = winston.createLogger({
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' }),
  ],
})

// 记录结构化日志
logger.info('Workflow executed', {
  tenantId,
  workflowId,
  executionId,
  duration: 1234,
  status: 'success',
  traceId: span.spanContext().traceId,
})
```

**Python结构化日志:**

```python
import structlog

logger = structlog.get_logger()

logger.info(
    "node_executed",
    node_id=node_id,
    node_type=node_type,
    duration=duration,
    status="success",
    trace_id=span.get_span_context().trace_id
)
```

### 4. 其他扩展能力

1. **分布式执行**: 支持Celery分布式任务队列
2. **模型扩展**: 支持接入OpenAI、Claude等云端模型
3. **导入导出**: 支持工作流模板市场
4. **版本控制**: 工作流版本管理和回滚
5. **审计日志**: 完整的操作审计追踪

## 最佳实践总结

### 前端最佳实践

1. **组件设计**
   - 使用Composition API和`<script setup>`语法
   - 遵循单一职责原则，保持组件小而专注
   - 使用TypeScript严格模式 (`"strict": true`)
   - 使用`defineProps`和`defineEmits`的类型推断

2. **状态管理**
   - 优先使用组合式函数(composables)处理局部状态
   - Pinia store用于全局共享状态
   - 使用`storeToRefs`保持响应性

3. **性能优化**
   - 使用`v-memo`优化列表渲染
   - 大列表使用虚拟滚动 (vue-virtual-scroller)
   - 使用`shallowRef`和`shallowReactive`优化大对象
   - 路由懒加载和组件异步加载

4. **代码组织**
   - 按功能模块组织代码，而非按类型
   - 使用路径别名 (`@/`, `~/`)
   - 统一的命名规范 (PascalCase组件, camelCase函数)

5. **类型安全**
   - 为API响应定义完整的TypeScript类型
   - 使用Zod进行运行时验证
   - 避免使用`any`，使用`unknown`代替

### BFF层最佳实践 (NestJS)

1. **模块化设计**
   - 按功能划分模块 (Auth, Workflows, Executions)
   - 使用依赖注入 (@Injectable)
   - 模块间通过接口通信

2. **类型安全**
   - 使用shared-types包共享类型
   - DTO使用class-validator验证
   - Prisma提供数据库类型安全

3. **错误处理**
   - 使用Exception Filters统一处理错误
   - 自定义业务异常类
   - 返回标准化错误响应

4. **认证授权**
   - JWT + Passport策略
   - Guards保护路由
   - RBAC权限控制

5. **性能优化**
   - 使用Redis缓存
   - 数据库查询优化
   - 响应压缩

6. **API文档**
   - 使用@nestjs/swagger自动生成
   - DTO添加ApiProperty装饰器
   - 提供完整的API示例

### Python AI服务最佳实践

1. **项目结构**
   - 采用分层架构: API -> Service -> Engine
   - 使用依赖注入 (FastAPI Depends)
   - 分离AI逻辑和HTTP层

2. **异步编程**
   - 全面使用`async/await`
   - 使用`asyncio.gather`并发执行
   - 避免阻塞操作，使用异步库

3. **数据库**
   - 使用连接池
   - 为查询字段添加索引
   - 使用事务保证数据一致性
   - 定期备份和迁移测试

4. **API设计**
   - 遵循RESTful规范
   - 使用HTTP状态码语义化
   - 提供详细的错误信息
   - API版本控制 (`/api/v1/`)
   - 使用Pydantic进行请求验证

5. **安全性**
   - 使用环境变量管理敏感信息
   - 实现速率限制 (slowapi)
   - 输入验证和输出转义
   - CORS配置
   - 日志脱敏

6. **可观测性**
   - 结构化日志 (structlog)
   - 请求追踪 (correlation ID)
   - 性能监控
   - 健康检查端点

### Monorepo最佳实践

1. **依赖管理**
   - 使用workspace协议引用内部包
   - 统一版本管理
   - 定期更新依赖

2. **构建优化**
   - 使用Turborepo缓存构建结果
   - 并行执行任务
   - 增量构建

3. **代码共享**
   - 提取共享类型到`packages/shared-types`
   - 共享工具函数到`packages/shared-utils`
   - 避免循环依赖

4. **开发体验**
   - 统一的代码格式化配置
   - 共享的ESLint规则
   - 统一的Git提交规范 (Conventional Commits)
   - 自动化的变更日志生成

### Docker最佳实践

1. **镜像优化**
   - 使用多阶段构建
   - 使用Alpine基础镜像减小体积
   - 合理使用.dockerignore
   - 缓存依赖层

2. **安全性**
   - 不使用root用户运行
   - 扫描镜像漏洞
   - 最小化镜像内容

3. **开发环境**
   - 使用docker-compose管理服务
   - 挂载卷实现热重载
   - 环境变量配置

### 测试最佳实践

1. **测试策略**
   - 单元测试覆盖核心逻辑
   - 集成测试验证API端点
   - E2E测试覆盖关键用户流程
   - 目标代码覆盖率 > 80%

2. **测试组织**
   - 测试文件与源文件同目录或镜像结构
   - 使用describe/it组织测试用例
   - 清晰的测试命名

3. **Mock和Fixture**
   - 使用工厂函数创建测试数据
   - Mock外部依赖
   - 使用pytest fixtures复用设置

### Git工作流

1. **分支策略**
   - main: 生产环境
   - develop: 开发环境
   - feature/\*: 功能分支
   - hotfix/\*: 紧急修复

2. **提交规范**
   - 使用Conventional Commits
   - 提交信息清晰描述变更
   - 小而频繁的提交

3. **代码审查**
   - 所有代码必须经过PR审查
   - 自动化检查 (CI)
   - 至少一人审批后合并
