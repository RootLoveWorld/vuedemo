# 需求文档

## 简介

本项目旨在构建一个企业级的AI工作流平台，允许用户通过可视化界面设计和执行基于大语言模型的工作流。系统采用前后端分离架构，前端使用Vue3提供流程图编辑能力，后端使用Python+LangChain/LangGraph处理AI工作流逻辑，支持本地Ollama模型，并可通过Docker容器化部署。

## 术语表

- **WorkflowPlatform**: 整个AI工作流平台系统
- **FlowEditor**: 前端可视化流程图编辑器组件
- **WorkflowEngine**: 后端工作流执行引擎
- **NodeExecutor**: 工作流节点执行器
- **OllamaService**: Ollama本地大模型服务接口
- **WorkflowDefinition**: 工作流定义数据结构
- **ExecutionContext**: 工作流执行上下文
- **MonorepoWorkspace**: 基于pnpm的单体仓库工作空间
- **BuildTool**: Vite 7构建工具
- **TestFramework**: Vitest测试框架
- **StateManager**: Pinia状态管理库
- **ValidationLibrary**: Zod数据验证库

## 需求

### 需求 1: 项目架构与工作空间管理

**用户故事:** 作为开发工程师，我希望项目采用现代化的单体仓库架构，以便统一管理前后端代码和依赖。

#### 验收标准

1. THE MonorepoWorkspace SHALL 使用pnpm workspace管理前端和后端包
2. THE MonorepoWorkspace SHALL 包含独立的frontend包和backend包
3. THE MonorepoWorkspace SHALL 提供统一的构建和开发脚本
4. THE MonorepoWorkspace SHALL 支持Docker容器化部署配置
5. THE MonorepoWorkspace SHALL 包含环境变量配置管理机制

### 需求 2: 前端可视化流程编辑器

**用户故事:** 作为业务用户，我希望通过拖拽方式创建AI工作流，以便无需编码即可设计复杂的处理流程。

#### 验收标准

1. THE FlowEditor SHALL 基于Vue3框架实现
2. THE FlowEditor SHALL 提供节点拖拽、连接、删除等基础编辑功能
3. THE FlowEditor SHALL 支持至少5种节点类型（LLM节点、条件节点、数据转换节点、输入节点、输出节点）
4. WHEN 用户连接两个节点时，THE FlowEditor SHALL 验证连接的有效性
5. THE FlowEditor SHALL 将工作流定义序列化为JSON格式

### 需求 3: 后端工作流执行引擎

**用户故事:** 作为系统，我需要能够解析和执行用户定义的工作流，以便实现AI处理逻辑。

#### 验收标准

1. THE WorkflowEngine SHALL 基于Python和LangGraph实现
2. WHEN 接收到WorkflowDefinition时，THE WorkflowEngine SHALL 解析并构建执行图
3. THE WorkflowEngine SHALL 支持节点间的数据传递和状态管理
4. THE WorkflowEngine SHALL 提供工作流执行的启动、暂停、恢复功能
5. IF 节点执行失败，THEN THE WorkflowEngine SHALL 记录错误并支持重试机制

### 需求 4: 本地大模型集成

**用户故事:** 作为系统管理员，我希望系统使用本地部署的Ollama模型，以便保护数据隐私和降低成本。

#### 验收标准

1. THE OllamaService SHALL 通过HTTP API与Ollama服务通信
2. THE OllamaService SHALL 支持配置不同的模型名称（如llama2、mistral等）
3. WHEN LLM节点执行时，THE NodeExecutor SHALL 调用OllamaService处理提示词
4. THE OllamaService SHALL 支持流式响应和批量响应两种模式
5. THE OllamaService SHALL 实现连接池和超时控制

### 需求 5: API接口设计

**用户故事:** 作为前端开发者，我需要清晰的RESTful API接口，以便前后端协作开发。

#### 验收标准

1. THE WorkflowPlatform SHALL 提供RESTful API用于工作流的CRUD操作
2. THE WorkflowPlatform SHALL 提供WebSocket接口用于实时执行状态推送
3. THE WorkflowPlatform SHALL 提供API端点用于触发工作流执行
4. THE WorkflowPlatform SHALL 提供API端点用于查询执行历史和日志
5. THE WorkflowPlatform SHALL 实现JWT或类似的身份认证机制

### 需求 6: 数据持久化

**用户故事:** 作为用户，我希望我的工作流定义和执行历史能够被保存，以便后续查看和复用。

#### 验收标准

1. THE WorkflowPlatform SHALL 使用数据库存储WorkflowDefinition
2. THE WorkflowPlatform SHALL 存储工作流执行历史和结果
3. THE WorkflowPlatform SHALL 支持工作流版本管理
4. THE WorkflowPlatform SHALL 提供数据导入导出功能
5. THE WorkflowPlatform SHALL 实现数据库迁移管理机制

### 需求 7: Docker容器化部署

**用户故事:** 作为运维工程师，我希望系统能够通过Docker快速部署，以便简化环境配置和扩展。

#### 验收标准

1. THE WorkflowPlatform SHALL 提供前端、后端、数据库的独立Docker镜像
2. THE WorkflowPlatform SHALL 提供docker-compose配置文件用于一键启动
3. THE WorkflowPlatform SHALL 在容器中正确配置Ollama服务连接
4. THE WorkflowPlatform SHALL 支持通过环境变量配置关键参数
5. THE WorkflowPlatform SHALL 提供健康检查端点用于容器编排

### 需求 8: 前端工具链与最佳实践

**用户故事:** 作为前端开发工程师，我希望使用现代化的构建工具和测试框架，以便获得最佳的开发体验和代码质量。

#### 验收标准

1. THE FlowEditor SHALL 使用Vite 7作为构建工具和开发服务器
2. THE FlowEditor SHALL 使用Vitest作为单元测试框架
3. THE FlowEditor SHALL 使用最新版本的TypeScript（5.x）进行类型检查
4. THE FlowEditor SHALL 集成Pinia用于状态管理
5. THE FlowEditor SHALL 集成Vue Router用于路由管理
6. THE FlowEditor SHALL 使用VueUse提供常用组合式函数
7. THE FlowEditor SHALL 集成Tailwind CSS或UnoCSS用于样式管理
8. THE FlowEditor SHALL 使用Axios或Ky进行HTTP请求
9. THE FlowEditor SHALL 集成Zod用于运行时数据验证

### 需求 9: 开发体验优化

**用户故事:** 作为开发工程师，我希望项目具有完善的开发工具配置，以便提高开发效率和代码质量。

#### 验收标准

1. THE MonorepoWorkspace SHALL 配置ESLint 9+和Prettier用于代码规范
2. THE MonorepoWorkspace SHALL 配置Husky和lint-staged用于Git钩子
3. THE MonorepoWorkspace SHALL 配置热重载用于前后端开发环境
4. THE MonorepoWorkspace SHALL 提供清晰的README文档说明项目结构和开发流程
5. THE MonorepoWorkspace SHALL 配置VSCode推荐扩展和工作区设置
6. THE MonorepoWorkspace SHALL 使用Changesets或类似工具管理版本发布
