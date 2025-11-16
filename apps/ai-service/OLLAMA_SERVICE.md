# OllamaService 实现文档

## 概述

OllamaService 是一个完整的 Ollama 本地大模型服务客户端，提供类型安全、高性能的异步API接口。

## 核心特性

### 1. 连接池管理

- **自动连接复用**: 使用 httpx.AsyncClient 的连接池功能
- **可配置连接数**: 默认最大5个连接，可通过环境变量调整
- **Keep-alive**: 连接保持30秒，减少握手开销
- **连接限制**: 最大连接数的2倍作为总连接限制

```python
self.client = httpx.AsyncClient(
    timeout=httpx.Timeout(
        timeout=self.timeout,
        connect=10.0,
        read=self.timeout,
        write=30.0,
    ),
    limits=httpx.Limits(
        max_keepalive_connections=self.max_connections,
        max_connections=self.max_connections * 2,
        keepalive_expiry=30.0,
    ),
)
```

### 2. 超时控制

三层超时机制:

- **连接超时**: 10秒 - 建立连接的最大时间
- **读取超时**: 300秒（可配置）- 等待响应的最大时间
- **写入超时**: 30秒 - 发送请求的最大时间

### 3. 错误重试

使用 tenacity 库实现智能重试:

- **重试条件**: 仅对连接错误和超时错误重试
- **重试次数**: 最多3次（拉取模型2次）
- **退避策略**: 指数退避，1-10秒之间
- **重新抛出**: 重试失败后抛出原始异常

```python
@retry(
    retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
)
async def generate(...):
    ...
```

### 4. 流式响应

支持两种生成模式:

**非流式模式**:

```python
response = await service.generate(
    model="llama2",
    prompt="Hello",
    stream=False
)
# 返回: str
```

**流式模式**:

```python
stream = await service.generate(
    model="llama2",
    prompt="Hello",
    stream=True
)
async for chunk in stream:
    print(chunk, end="")
# 返回: AsyncIterator[str]
```

### 5. 模型管理

#### 列出模型

```python
models = await service.list_models()
# 返回: list[dict[str, Any]]
# 每个模型包含: name, size, modified_at 等字段
```

#### 获取模型信息

```python
info = await service.show_model("llama2")
# 返回: dict[str, Any]
# 包含: modelfile, parameters, template 等
```

#### 拉取模型

```python
async for progress in service.pull_model("tinyllama"):
    status = progress.get("status")
    if "total" in progress:
        percent = progress["completed"] / progress["total"] * 100
        print(f"{status}: {percent:.1f}%")
```

### 6. 错误处理

三种自定义异常:

```python
class OllamaServiceError(Exception):
    """基础错误类"""
    pass

class OllamaConnectionError(OllamaServiceError):
    """连接失败"""
    pass

class OllamaModelNotFoundError(OllamaServiceError):
    """模型未找到"""
    pass
```

使用示例:

```python
try:
    response = await service.generate(model="invalid", prompt="test")
except OllamaModelNotFoundError as e:
    logger.error(f"模型不存在: {e}")
except OllamaConnectionError as e:
    logger.error(f"连接失败: {e}")
except OllamaServiceError as e:
    logger.error(f"服务错误: {e}")
```

### 7. 资源管理

支持异步上下文管理器:

```python
async with OllamaService() as service:
    models = await service.list_models()
    response = await service.generate(model="llama2", prompt="test")
    # 自动调用 service.close()
```

手动管理:

```python
service = OllamaService()
try:
    # 使用服务
    pass
finally:
    await service.close()
```

## API 参考

### 构造函数

```python
def __init__(
    self,
    base_url: Optional[str] = None,
    timeout: Optional[float] = None,
    max_connections: Optional[int] = None,
)
```

参数:

- `base_url`: Ollama服务地址，默认从配置读取
- `timeout`: 请求超时时间（秒），默认从配置读取
- `max_connections`: 最大连接数，默认从配置读取

### 方法

#### generate()

```python
async def generate(
    self,
    model: str,
    prompt: str,
    stream: bool = False,
    **kwargs: Any,
) -> str | AsyncIterator[str]
```

调用Ollama生成接口。

参数:

- `model`: 模型名称（如 llama2, mistral）
- `prompt`: 提示词
- `stream`: 是否使用流式响应
- `**kwargs`: 其他参数（temperature, top_p, top_k 等）

返回:

- 非流式: `str` - 完整文本
- 流式: `AsyncIterator[str]` - 文本片段迭代器

异常:

- `OllamaConnectionError`: 连接失败
- `OllamaModelNotFoundError`: 模型未找到
- `OllamaServiceError`: 其他错误

#### list_models()

```python
async def list_models(self) -> list[dict[str, Any]]
```

获取可用模型列表。

返回: 模型信息列表

#### show_model()

```python
async def show_model(self, model: str) -> dict[str, Any]
```

获取模型详细信息。

参数:

- `model`: 模型名称

返回: 模型详细信息

#### pull_model()

```python
async def pull_model(self, model: str) -> AsyncIterator[dict[str, Any]]
```

拉取新模型。

参数:

- `model`: 模型名称

返回: 拉取进度信息的异步迭代器

#### health_check()

```python
async def health_check(self) -> bool
```

健康检查。

返回: 服务是否健康

#### close()

```python
async def close(self) -> None
```

关闭客户端连接。

## 配置

### 环境变量

```bash
# Ollama服务地址
OLLAMA_BASE_URL=http://localhost:11434

# 默认模型
OLLAMA_DEFAULT_MODEL=llama2

# 请求超时时间（秒）
OLLAMA_TIMEOUT=300

# 最大连接数
OLLAMA_MAX_CONNECTIONS=5
```

### 代码配置

```python
from app.core.config import get_settings

settings = get_settings()
service = OllamaService(
    base_url=settings.ollama_base_url,
    timeout=settings.ollama_timeout,
    max_connections=settings.ollama_max_connections,
)
```

## 性能优化

### 1. 连接复用

- 使用连接池避免频繁建立连接
- Keep-alive保持连接活跃
- 减少TCP握手开销

### 2. 异步I/O

- 完全异步的API设计
- 支持并发请求
- 不阻塞事件循环

### 3. 流式响应

- 减少内存占用
- 更快的首字节时间
- 支持实时输出

### 4. 智能重试

- 仅对临时错误重试
- 指数退避避免雪崩
- 快速失败机制

## 最佳实践

### 1. 使用上下文管理器

```python
async with OllamaService() as service:
    # 自动管理资源
    response = await service.generate(...)
```

### 2. 错误处理

```python
try:
    response = await service.generate(...)
except OllamaModelNotFoundError:
    # 处理模型不存在
    pass
except OllamaConnectionError:
    # 处理连接失败
    pass
```

### 3. 流式生成

对于长文本生成，使用流式模式:

```python
stream = await service.generate(model="llama2", prompt=long_prompt, stream=True)
async for chunk in stream:
    # 实时处理每个片段
    process_chunk(chunk)
```

### 4. 健康检查

在应用启动时检查服务可用性:

```python
service = OllamaService()
if not await service.health_check():
    logger.error("Ollama service is not available")
    raise RuntimeError("Cannot connect to Ollama")
```

## 测试

运行测试:

```bash
cd apps/ai-service
pytest tests/test_ollama_service.py -v
```

测试覆盖:

- ✅ 非流式生成
- ✅ 连接错误处理
- ✅ 模型未找到错误
- ✅ 模型列表获取
- ✅ 模型信息获取
- ✅ 健康检查
- ✅ 资源清理
- ✅ 上下文管理器

## 示例

查看完整示例:

```bash
cd apps/ai-service
python -m examples.ollama_example
```

示例包含:

1. 基本使用
2. 上下文管理器
3. 错误处理
4. 模型拉取

## 依赖

- `httpx >= 0.26.0`: 异步HTTP客户端
- `tenacity >= 8.2.3`: 错误重试
- `pydantic >= 2.6.0`: 配置管理
- `structlog >= 24.1.0`: 结构化日志

## 许可

MIT License
