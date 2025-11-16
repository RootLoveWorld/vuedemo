# 节点执行器文档

本目录包含AI工作流平台的内置节点执行器实现。

## 已实现的节点执行器

### 1. InputNodeExecutor (输入节点)

**文件**: `input_node.py`

处理工作流的输入数据，支持数据验证和默认值。

**配置参数**:

- `schema`: 输入数据schema（可选）- 定义期望的输入字段和类型
- `defaults`: 默认值（可选）- 当输入数据中缺少某些字段时使用
- `extract_field`: 提取特定字段（可选）
- `validate`: 是否验证输入（可选，默认false）

**示例配置**:

```json
{
  "validate": true,
  "schema": {
    "name": { "type": "string", "required": true },
    "age": { "type": "number", "required": false }
  },
  "defaults": {
    "age": 0
  }
}
```

### 2. LLMNodeExecutor (LLM节点)

**文件**: `llm_node.py`

调用Ollama服务执行大语言模型推理。

**配置参数**:

- `model`: 模型名称（必需）
- `prompt`: 提示词模板（必需）- 支持变量替换
- `stream`: 是否使用流式输出（可选，默认False）
- `temperature`: 温度参数（可选，默认0.7）
- `max_tokens`: 最大token数（可选）
- `top_p`: top_p参数（可选）
- `top_k`: top_k参数（可选）

**示例配置**:

```json
{
  "model": "llama2",
  "prompt": "Analyze the following text: {{input.text}}",
  "temperature": 0.7,
  "stream": false
}
```

### 3. ConditionNodeExecutor (条件节点)

**文件**: `condition_node.py`

根据条件表达式评估结果，决定工作流的分支走向。

**配置参数**:

- `conditions`: 条件列表（必需）
  - `field`: 要比较的字段路径
  - `operator`: 比较操作符（eq, ne, gt, gte, lt, lte, contains, in）
  - `value`: 比较值
  - `branch`: 满足条件时的分支名称
- `default_branch`: 默认分支（可选）

**示例配置**:

```json
{
  "conditions": [
    {
      "field": "input.age",
      "operator": "gte",
      "value": 18,
      "branch": "adult"
    },
    {
      "field": "input.age",
      "operator": "lt",
      "value": 18,
      "branch": "minor"
    }
  ],
  "default_branch": "unknown"
}
```

### 4. TransformNodeExecutor (转换节点)

**文件**: `transform_node.py`

对数据进行转换和映射操作。

**配置参数**:

- `transform_type`: 转换类型（必需）
  - `mapping`: 字段映射
  - `filter`: 字段过滤
  - `merge`: 合并多个输入
  - `extract`: 提取特定字段
  - `custom`: 自定义转换（使用表达式）
- `mappings`: 字段映射配置（mapping类型时必需）
- `fields`: 字段列表（filter或extract类型时必需）
- `sources`: 源节点列表（merge类型时必需）
- `expression`: 自定义表达式（custom类型时必需）

**示例配置**:

```json
{
  "transform_type": "mapping",
  "mappings": {
    "user_name": "{{input.name}}",
    "user_age": "{{input.age}}",
    "full_info": "Name: {{input.name}}, Age: {{input.age}}"
  }
}
```

### 5. OutputNodeExecutor (输出节点)

**文件**: `output_node.py`

格式化和过滤工作流的输出数据。

**配置参数**:

- `source_node`: 源节点ID（可选）
- `format`: 输出格式（可选）
  - `raw`: 原始输出（默认）
  - `json`: JSON字符串
  - `text`: 纯文本
  - `custom`: 自定义格式化
- `fields`: 要包含的字段列表（可选）
- `exclude_fields`: 要排除的字段列表（可选）
- `template`: 输出模板（可选，format为custom时使用）
- `pretty`: 是否美化输出（可选，format为json时使用）

**示例配置**:

```json
{
  "format": "json",
  "pretty": true,
  "fields": ["result", "status"]
}
```

## 使用方法

### 注册节点执行器

```python
from app.engine import WorkflowEngine
from app.engine.nodes import (
    InputNodeExecutor,
    LLMNodeExecutor,
    ConditionNodeExecutor,
    TransformNodeExecutor,
    OutputNodeExecutor,
)
from app.services.ollama_service import OllamaService

# 创建工作流引擎
engine = WorkflowEngine()

# 注册节点执行器
engine.register_executor("input", InputNodeExecutor)
engine.register_executor("output", OutputNodeExecutor)
engine.register_executor("condition", ConditionNodeExecutor)
engine.register_executor("transform", TransformNodeExecutor)

# LLM节点需要Ollama服务实例
ollama_service = OllamaService()
engine.register_executor("llm", lambda node_id: LLMNodeExecutor(node_id, ollama_service))
```

### 执行工作流

```python
# 定义工作流
workflow_definition = WorkflowDefinition(
    nodes=[
        FlowNode(
            id="input1",
            type="input",
            position=NodePosition(x=0, y=0),
            data=NodeData(label="Input", config={"validate": False}),
        ),
        FlowNode(
            id="llm1",
            type="llm",
            position=NodePosition(x=100, y=0),
            data=NodeData(
                label="LLM",
                config={
                    "model": "llama2",
                    "prompt": "Analyze: {{input.text}}"
                }
            ),
        ),
        FlowNode(
            id="output1",
            type="output",
            position=NodePosition(x=200, y=0),
            data=NodeData(label="Output", config={"format": "json"}),
        ),
    ],
    edges=[
        FlowEdge(id="edge1", source="input1", target="llm1"),
        FlowEdge(id="edge2", source="llm1", target="output1"),
    ],
)

# 执行工作流
result = await engine.execute_workflow(
    execution_id="exec-1",
    workflow_id="wf-1",
    definition=workflow_definition,
    input_data={"text": "Hello, world!"},
)
```

## 变量解析

所有节点执行器都支持在配置中使用变量引用，格式为 `{{variable_path}}`。

支持的变量路径:

- `{{input.field}}`: 输入数据字段
- `{{nodes.node_id.field}}`: 节点输出字段
- `{{variables.var_name}}`: 自定义变量

示例:

```json
{
  "prompt": "User {{input.name}} is {{input.age}} years old. Previous result: {{nodes.node1.result}}"
}
```

## 错误处理

所有节点执行器都继承自 `NodeExecutor` 基类，提供统一的错误处理机制:

1. **配置验证错误** (`NodeValidationError`): 节点配置不符合要求
2. **执行错误** (`NodeExecutionError`): 节点执行过程中发生错误
3. **未预期错误**: 其他异常会被捕获并转换为执行错误

错误信息会被记录到执行上下文的日志中，并通过回调函数通知外部系统。

## 扩展新节点

要实现新的节点执行器:

1. 继承 `NodeExecutor` 基类
2. 实现 `validate_config()` 方法验证配置
3. 实现 `execute()` 方法执行节点逻辑
4. 在工作流引擎中注册新的执行器

示例:

```python
from app.engine.nodes.base import NodeExecutor, NodeExecutionError, NodeValidationError
from app.engine.context import ExecutionContext
from app.schemas.node import NodeResult

class CustomNodeExecutor(NodeExecutor):
    def __init__(self, node_id: str):
        super().__init__(node_id, "custom")

    def validate_config(self, config: Dict[str, Any]) -> bool:
        # 验证配置
        if "required_field" not in config:
            raise NodeValidationError("Missing required_field")
        return True

    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        # 执行逻辑
        result = do_something(node_config)

        return NodeResult(
            node_id=self.node_id,
            status="success",
            output=result,
        )
```

## 测试

每个节点执行器都应该有对应的单元测试。参考 `tests/test_workflow_engine.py` 中的测试示例。

基本测试模式:

```python
@pytest.mark.asyncio
async def test_custom_node():
    context = ExecutionContext(
        execution_id="test-1",
        workflow_id="wf-1",
        input_data={"key": "value"},
    )

    executor = CustomNodeExecutor(node_id="node1")
    config = {"required_field": "value"}

    result = await executor.run(config, context)

    assert result.status == "success"
    assert result.output is not None
```
