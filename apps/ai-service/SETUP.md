# AI Service 设置指南

## 前置要求

- Python 3.12+ (当前系统: Python 3.14.0 ✓)
- Poetry (Python依赖管理工具)

## 安装步骤

### 1. 安装Poetry

如果还没有安装Poetry，使用以下命令安装：

```bash
# 官方安装脚本
curl -sSL https://install.python-poetry.org | python3 -

# 或使用pip安装
pip install poetry

# 或使用homebrew (macOS)
brew install poetry
```

安装后，确认Poetry可用：

```bash
poetry --version
```

### 2. 安装项目依赖

进入ai-service目录并安装依赖：

```bash
cd apps/ai-service
poetry install
```

这将创建虚拟环境并安装所有依赖。

### 3. 配置环境变量

复制示例环境变量文件：

```bash
cp .env.example .env
```

根据需要修改 `.env` 文件中的配置。

### 4. 启动开发服务器

使用以下任一方式启动：

```bash
# 方式1: 使用Makefile
make dev

# 方式2: 使用Poetry直接运行
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 方式3: 进入Poetry shell后运行
poetry shell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

服务将在 http://localhost:8000 启动。

### 5. 验证安装

访问以下URL验证服务正常运行：

- 健康检查: http://localhost:8000/health
- API文档: http://localhost:8000/docs
- ReDoc文档: http://localhost:8000/redoc

或使用curl测试：

```bash
curl http://localhost:8000/health
```

## 开发工作流

### 运行测试

```bash
# 运行所有测试
make test

# 运行测试并生成覆盖率报告
make test-cov
```

### 代码格式化

```bash
# 格式化代码
make format

# 运行linter检查
make lint
```

### 清理临时文件

```bash
make clean
```

### 查看所有可用命令

```bash
make help
```

## 项目结构

```
app/
├── api/              # API路由
│   ├── v1/          # API v1版本
│   │   └── __init__.py
│   ├── __init__.py
│   └── deps.py      # 依赖注入
├── core/            # 核心配置
│   ├── __init__.py
│   ├── config.py    # 配置管理
│   └── logging.py   # 日志配置
├── engine/          # 工作流引擎 (待实现)
│   ├── nodes/       # 节点执行器
│   │   └── __init__.py
│   └── __init__.py
├── services/        # 服务层 (待实现)
│   └── __init__.py
├── schemas/         # Pydantic schemas (待实现)
│   └── __init__.py
├── __init__.py
└── main.py          # 应用入口
```

## 下一步

项目基础结构已完成，接下来可以实现：

1. Ollama服务客户端 (task 17)
2. 工作流引擎核心 (task 18)
3. 内置节点执行器 (task 19)
4. 执行API (task 20)
5. 插件系统 (task 21)

## 故障排除

### Poetry安装失败

如果Poetry安装失败，尝试：

```bash
# 使用pip安装
python3 -m pip install --user poetry

# 或使用pipx
python3 -m pip install --user pipx
pipx install poetry
```

### 依赖安装失败

如果依赖安装失败，尝试：

```bash
# 清除Poetry缓存
poetry cache clear pypi --all

# 重新安装
poetry install --no-cache
```

### 端口被占用

如果8000端口被占用，修改 `.env` 文件中的 `PORT` 配置，或启动时指定端口：

```bash
poetry run uvicorn app.main:app --reload --port 8001
```
