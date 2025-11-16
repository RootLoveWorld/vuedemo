# OllamaService 使用示例

本目录包含 OllamaService 的使用示例代码。

## 前置条件

1. 确保 Ollama 服务正在运行：

   ```bash
   ollama serve
   ```

2. 至少拉取一个模型：
   ```bash
   ollama pull llama2
   # 或使用更小的模型
   ollama pull tinyllama
   ```

## 运行示例

```bash
# 从项目根目录运行
cd apps/ai-service
python -m examples.ollama_example
```

## 示例说明

### 1. 基本使用示例 (example_basic_usage)

- 健康检查
- 获取模型列表
- 非流式生成
- 流式生成
- 获取模型详细信息

### 2. 上下文管理器示例 (example_context_manager)

- 使用 `async with` 自动管理连接生命周期

### 3. 错误处理示例 (example_error_handling)

- 演示如何捕获和处理不同类型的错误
- OllamaModelNotFoundError
- OllamaConnectionError
- OllamaServiceError

### 4. 拉取模型示例 (example_pull_model)

- 演示如何拉取新模型
- 显示下载进度

## 配置

OllamaService 会从环境变量或配置文件读取以下配置：

- `OLLAMA_BASE_URL`: Ollama 服务地址（默认: http://localhost:11434）
- `OLLAMA_TIMEOUT`: 请求超时时间（默认: 300秒）
- `OLLAMA_MAX_CONNECTIONS`: 最大连接数（默认: 5）

## 功能特性

### 连接池管理

- 自动管理 HTTP 连接池
- 支持连接复用和保持活动
- 可配置最大连接数

### 超时控制

- 连接超时: 10秒
- 读取超时: 可配置（默认300秒）
- 写入超时: 30秒

### 错误重试

- 自动重试连接错误和超时错误
- 使用指数退避策略
- 最多重试3次（拉取模型重试2次）

### 模型管理

- 列出所有可用模型
- 获取模型详细信息
- 拉取新模型（支持进度跟踪）

### 流式响应

- 支持流式和非流式两种生成模式
- 流式响应使用异步迭代器
- 自动处理 JSON 解析和错误
