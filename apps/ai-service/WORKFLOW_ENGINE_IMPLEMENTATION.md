# 工作流引擎核心实现文档

## 概述

本文档描述了任务18"实现工作流引擎核心"的完整实现。该实现包括三个主要组件：

1. **WorkflowEngine** - 工作流执行引擎
2. **NodeExecutor** - 节点执行器基类
3. **ExecutionContext** - 执行上下文管理

## 实现的文件

### 1. 数据模型 (Schemas)

#### `app/schemas/workflow.py`

定义工作流相关的Pydantic数据模型：

- `NodePosition` - 节点位置
- `NodeData` - 节点数据
- `FlowNode` - 流程节点
- `FlowEdge` - 流程边
- `WorkflowDefinition` - 工作流定义
- `WorkflowCreate` - 创建工作流请求
- `WorkflowResponse` - 工作流响应

#### `app/schemas/execution.py`

定义执行相关的数据模型：

- `ExecutionCreate` - 执行请求
- `ExecutionResponse` - 执行响应
- `ExecutionStatus` - 执行状态
- `ExecutionLog` - 执行日志

#### `app/schemas/node.py`

定义节点相关的数据模型：

- `NodeConfig` - 节点配置
- `NodeResult` - 节点执行结果
- `NodeExecutionContext` - 节点执行上下文

### 2. 执行上下文 (ExecutionContext)

#### `app/engine/context.py`

**职责：**

- 管理工作流执行状态
- 实现节点间数据传递
- 实现变量解析和替换
- 存储执行历史和日志

**核心功能：**

1. **状态管理**
   - `start()` - 开始执行
   - `complete(output_data)` - 完成执行
   - `fail(error)` - 执行失败

2. **变量管理**
   - `set_variable(key, value)` - 设置变量
   - `get_variable(key, default)` - 获取变量
   - `resolve_variables(text)` - 解析变量引用

3. **节点输出管理**
   - `set_node_output(node_id, output)` - 设置节点输出
   - `get_node_output(node_id, default)` - 获取节点输出

4. **节点状态管理**
   - `set_node_status(node_id, status)` - 设置节点状态
   - `get_node_status(node_id)` - 获取节点状态

5. **日志管理**
   - `add_log(level, message, node_id, metadata)` - 添加日志

6. **变量解析**
   - 支持 `{{input.field}}` - 输入数据字段
   - 支持 `{{nodes.node_id.field}}` - 节点输出字段
   - 支持 `{{variables.var_name}}` - 自定义变量

**示例：**

```python
context = ExecutionContext(
    execution_id="exec-001",
    workflow_id="workflow-001",
    input_data={"user": "Alice"},
)

# 设置变量
context.set_variable("greeting", "Hello")

# 解析变量
text = context.resolve_variables("{{greeting}} {{input.user}}!")
# 结果: "Hello Alice!"

# 设置节点输出
context.set_node_output("node1", {"result": "success"})

# 获取节点输出
output = context.get_node_output("node1")
```

### 3. 节点执行器基类 (NodeExecutor)

#### `app/engine/nodes/base.py`

**职责：**

- 定义节点执行接口
- 实现配置验证
- 实现错误处理
- 提供通用工具方法

**核心方法：**

1. **抽象方法（必须实现）**
   - `execute(node_config, context)` - 执行节点逻辑
   - `validate_config(config)` - 验证节点配置

2. **模板方法**
   - `run(node_config, context)` - 运行节点（包含错误处理）

3. **工具方法**
   - `get_input_from_context(context, source_node_id)` - 获取输入数据
   - `log_info/warning/error(message, context)` - 记录日志

**错误处理：**

- `NodeExecutionError` - 节点执行错误
- `NodeValidationError` - 节点配置验证错误

**示例实现：**

```python
class MyCustomExecutor(NodeExecutor):
    async def execute(self, node_config, context):
        # 获取输入
        input_data = self.get_input_from_context(context)

        # 处理逻辑
        result = process_data(input_data)

        # 返回结果
        return NodeResult(
            node_id=self.node_id,
            status="success",
            output=result,
        )

    def validate_config(self, config):
        # 验证必需字段
        return "required_field" in config
```

### 4. 工作流引擎 (WorkflowEngine)

#### `app/engine/workflow_engine.py`

**职责：**

- 解析工作流定义
- 构建执行图
- 管理节点执行顺序
- 处理节点间的数据流
- 管理执行状态

**核心功能：**

1. **执行器注册**
   - `register_executor(node_type, executor_class)` - 注册节点执行器
   - `get_registered_node_types()` - 获取已注册的节点类型

2. **工作流执行**
   - `execute_workflow(execution_id, workflow_id, definition, input_data, callback)` - 执行工作流

3. **图构建与验证**
   - `_build_execution_graph(definition)` - 构建执行图
   - `_validate_graph(graph)` - 验证图的有效性
   - `_has_cycle(graph)` - 检测循环依赖

4. **图执行**
   - `_execute_graph(graph, nodes, context)` - 执行工作流图
   - `_execute_node(node, context)` - 执行单个节点

**特性：**

- ✅ 支持有向无环图(DAG)
- ✅ 支持并行执行（同一层级的节点）
- ✅ 支持拓扑排序执行
- ✅ 循环依赖检测
- ✅ 错误处理和恢复
- ✅ 实时状态回调

**执行流程：**

```
1. 创建执行上下文
2. 构建执行图（邻接表）
3. 验证图（检测循环）
4. 拓扑排序执行
   - 计算节点入度
   - 找到起始节点（入度为0）
   - 并行执行就绪节点
   - 更新后续节点入度
   - 重复直到所有节点执行完成
5. 返回执行结果
```

**示例使用：**

```python
# 创建引擎
engine = WorkflowEngine()

# 注册执行器
engine.register_executor("input", InputExecutor)
engine.register_executor("llm", LLMExecutor)
engine.register_executor("output", OutputExecutor)

# 执行工作流
result = await engine.execute_workflow(
    execution_id="exec-001",
    workflow_id="workflow-001",
    definition=workflow_definition,
    input_data={"message": "Hello"},
    callback=lambda event: print(event),
)

# 结果
# {
#     "status": "completed",
#     "output": {...},
#     "summary": {
#         "execution_id": "exec-001",
#         "duration": 1.23,
#         "node_count": 3,
#         "completed_nodes": 3,
#         ...
#     }
# }
```

## 架构设计

### 执行流程图

```
┌─────────────────────────────────────────────────────────┐
│                    WorkflowEngine                        │
│                                                          │
│  1. 创建ExecutionContext                                 │
│  2. 构建执行图                                           │
│  3. 验证图（循环检测）                                    │
│  4. 拓扑排序执行                                         │
│     ├─ 计算入度                                          │
│     ├─ 找到起始节点                                      │
│     ├─ 并行执行就绪节点                                  │
│     │   └─ NodeExecutor.run()                           │
│     │       ├─ 验证配置                                  │
│     │       ├─ 解析变量                                  │
│     │       ├─ 执行节点                                  │
│     │       └─ 更新上下文                                │
│     └─ 更新后续节点入度                                  │
│  5. 返回结果                                             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  ExecutionContext                        │
│                                                          │
│  • 管理执行状态                                          │
│  • 存储节点输出                                          │
│  • 解析变量引用                                          │
│  • 记录执行日志                                          │
│  • 触发状态回调                                          │
└─────────────────────────────────────────────────────────┘
```

### 数据流

```
Input Data
    │
    ▼
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Node 1  │────▶│ Node 2  │────▶│ Node 3  │
│ (Input) │     │(Transform)    │(Output) │
└─────────┘     └─────────┘     └─────────┘
    │               │               │
    ▼               ▼               ▼
  Output 1       Output 2       Output 3
    │               │               │
    └───────────────┴───────────────┘
                    │
                    ▼
            ExecutionContext
            (存储所有输出)
```

## 测试

### 测试文件

#### `tests/test_workflow_engine.py`

包含以下测试用例：

1. ✅ 工作流引擎初始化测试
2. ✅ 简单工作流执行测试
3. ✅ 执行上下文测试
4. ✅ 变量解析测试
5. ✅ 循环依赖检测测试
6. ✅ 错误处理测试

### 示例程序

#### `examples/workflow_engine_example.py`

演示完整的工作流执行流程：

- 创建工作流引擎
- 注册节点执行器
- 创建工作流定义
- 执行工作流
- 处理执行结果

## 使用指南

### 1. 创建自定义节点执行器

```python
from app.engine.nodes.base import NodeExecutor
from app.schemas.node import NodeResult

class MyCustomExecutor(NodeExecutor):
    async def execute(self, node_config, context):
        # 1. 获取输入数据
        input_data = self.get_input_from_context(
            context,
            node_config.get("source_node")
        )

        # 2. 执行业务逻辑
        result = await my_business_logic(input_data, node_config)

        # 3. 记录日志
        self.log_info(f"Processed {len(result)} items", context)

        # 4. 返回结果
        return NodeResult(
            node_id=self.node_id,
            status="success",
            output=result,
        )

    def validate_config(self, config):
        # 验证必需的配置项
        required_fields = ["param1", "param2"]
        return all(field in config for field in required_fields)
```

### 2. 注册并使用执行器

```python
from app.engine import WorkflowEngine

# 创建引擎
engine = WorkflowEngine()

# 注册执行器
engine.register_executor("my_custom_node", MyCustomExecutor)

# 执行工作流
result = await engine.execute_workflow(
    execution_id="exec-001",
    workflow_id="workflow-001",
    definition=workflow_definition,
    input_data={"key": "value"},
)
```

### 3. 创建工作流定义

```python
from app.schemas.workflow import (
    WorkflowDefinition,
    FlowNode,
    FlowEdge,
    NodeData,
    NodePosition,
)

workflow = WorkflowDefinition(
    nodes=[
        FlowNode(
            id="node1",
            type="input",
            position=NodePosition(x=0, y=0),
            data=NodeData(
                label="Input Node",
                config={},
            ),
        ),
        FlowNode(
            id="node2",
            type="my_custom_node",
            position=NodePosition(x=200, y=0),
            data=NodeData(
                label="Custom Node",
                config={
                    "source_node": "node1",
                    "param1": "value1",
                    "param2": "value2",
                },
            ),
        ),
    ],
    edges=[
        FlowEdge(
            id="edge1",
            source="node1",
            target="node2",
        ),
    ],
)
```

## 下一步

完成任务18后，可以继续实现：

### 任务19: 实现内置节点执行器

- 19.1 实现LLMNodeExecutor
- 19.2 实现ConditionNodeExecutor
- 19.3 实现TransformNodeExecutor
- 19.4 实现InputNodeExecutor
- 19.5 实现OutputNodeExecutor

### 任务20: 实现执行API

- 20.1 创建执行端点
- 20.2 实现执行状态管理
- 20.3 实现执行控制

## 总结

本次实现完成了工作流引擎的核心功能：

✅ **任务18.1** - 创建WorkflowEngine

- 工作流解析
- 执行图构建
- 状态管理
- 拓扑排序执行
- 循环依赖检测

✅ **任务18.2** - 创建NodeExecutor基类

- 执行接口定义
- 配置验证
- 错误处理
- 工具方法

✅ **任务18.3** - 实现ExecutionContext

- 执行状态管理
- 数据传递
- 变量解析
- 日志记录

所有核心组件都已实现并通过了基本的功能验证。引擎支持：

- ✅ DAG工作流执行
- ✅ 并行节点执行
- ✅ 变量解析和数据传递
- ✅ 错误处理和日志记录
- ✅ 实时状态回调
- ✅ 循环依赖检测

引擎已准备好集成具体的节点执行器（如LLM节点、条件节点等）。
