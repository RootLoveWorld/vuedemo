# AI Workflow Service

AI工作流执行服务，基于FastAPI和LangGraph实现。

## 技术栈

- **FastAPI 0.110+**: 现代化的Python Web框架
- **Python 3.12+**: 最新的Python版本
- **LangChain 0.1+**: AI应用开发框架
- **LangGraph 0.0.40+**: 工作流编排引擎
- **Pydantic 2.x**: 数据验证
- **structlog**: 结构化日志
- **httpx**: 异步HTTP客户端

## 项目结构

```
app/
├── api/              # API路由
│   ├── v1/          # API v1版本
│   └── deps.py      # 依赖注入
├── core/            # 核心配置
│   ├── config.py    # 配置管理
│   └── logging.py   # 日志配置
├── engine/          # 工作流引擎
│   ├── graph_builder.py
│   ├── executor.py
│   └── nodes/       # 节点执行器
├── services/        # 服务层
│   ├── ollama_service.py
│   └── execution_service.py
├── schemas/         # Pydantic schemas
│   ├── workflow.py
│   ├── execution.py
│   └── node.py
└── main.py          # 应用入口
```

## 开发环境设置

### 安装依赖

使用Poetry管理依赖：

```bash
# 安装Poetry (如果还没有安装)
curl -sSL https://install.python-poetry.org | python3 -

# 安装项目依赖
poetry install

# 激活虚拟环境
poetry shell
```

### 运行开发服务器

```bash
# 使用uvicorn运行
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 运行测试

```bash
# 运行所有测试
poetry run pytest

# 运行测试并生成覆盖率报告
poetry run pytest --cov=app --cov-report=html
```

### 代码格式化和检查

```bash
# 格式化代码
poetry run black app/ tests/

# 运行linter
poetry run ruff check app/ tests/

# 类型检查
poetry run mypy app/
```

## 环境变量

创建 `.env` 文件：

```env
# 应用配置
APP_NAME=AI Workflow Service
APP_VERSION=0.1.0
DEBUG=true
LOG_LEVEL=INFO

# 服务配置
HOST=0.0.0.0
PORT=8000

# Ollama配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama2

# Redis配置 (可选)
REDIS_URL=redis://localhost:6379/0
```

## API文档

启动服务后访问：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## Docker支持

```bash
# 构建镜像
docker build -t ai-workflow-service -f ../../docker/ai-service.Dockerfile .

# 运行容器
docker run -p 8000:8000 --env-file .env ai-workflow-service
```
