"""工作流引擎使用示例

演示如何使用WorkflowEngine执行简单的工作流。
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from typing import Any, Dict

from app.engine import WorkflowEngine, ExecutionContext, NodeExecutor
from app.schemas.workflow import WorkflowDefinition, FlowNode, FlowEdge, NodeData, NodePosition
from app.schemas.node import NodeResult


class SimpleInputExecutor(NodeExecutor):
    """简单输入节点执行器"""

    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        """返回输入数据"""
        self.log_info("Processing input data", context)
        
        return NodeResult(
            node_id=self.node_id,
            status="success",
            output=context.input_data,
        )

    def validate_config(self, config: Dict[str, Any]) -> bool:
        return True


class SimpleTransformExecutor(NodeExecutor):
    """简单转换节点执行器"""

    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        """转换数据：将文本转换为大写"""
        # 获取前一个节点的输出
        source_node = node_config.get("source_node")
        input_data = context.get_node_output(source_node) if source_node else context.input_data
        
        self.log_info(f"Transforming data from node: {source_node}", context)
        
        # 转换：将所有字符串值转换为大写
        output = {}
        for key, value in input_data.items():
            if isinstance(value, str):
                output[key] = value.upper()
            else:
                output[key] = value
        
        output["transformed"] = True
        
        return NodeResult(
            node_id=self.node_id,
            status="success",
            output=output,
        )

    def validate_config(self, config: Dict[str, Any]) -> bool:
        return True


class SimpleOutputExecutor(NodeExecutor):
    """简单输出节点执行器"""

    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        """格式化输出"""
        # 获取前一个节点的输出
        source_node = node_config.get("source_node")
        input_data = context.get_node_output(source_node) if source_node else context.input_data
        
        self.log_info("Formatting output", context)
        
        # 格式化输出
        output = {
            "result": input_data,
            "execution_id": context.execution_id,
            "workflow_id": context.workflow_id,
        }
        
        return NodeResult(
            node_id=self.node_id,
            status="success",
            output=output,
        )

    def validate_config(self, config: Dict[str, Any]) -> bool:
        return True


def create_simple_workflow() -> WorkflowDefinition:
    """创建一个简单的线性工作流
    
    工作流结构:
    Input -> Transform -> Output
    """
    return WorkflowDefinition(
        nodes=[
            FlowNode(
                id="input_node",
                type="input",
                position=NodePosition(x=0, y=0),
                data=NodeData(
                    label="Input Node",
                    config={},
                ),
            ),
            FlowNode(
                id="transform_node",
                type="transform",
                position=NodePosition(x=200, y=0),
                data=NodeData(
                    label="Transform Node",
                    config={"source_node": "input_node"},
                ),
            ),
            FlowNode(
                id="output_node",
                type="output",
                position=NodePosition(x=400, y=0),
                data=NodeData(
                    label="Output Node",
                    config={"source_node": "transform_node"},
                ),
            ),
        ],
        edges=[
            FlowEdge(
                id="edge1",
                source="input_node",
                target="transform_node",
            ),
            FlowEdge(
                id="edge2",
                source="transform_node",
                target="output_node",
            ),
        ],
    )


async def main():
    """主函数"""
    print("=" * 60)
    print("工作流引擎示例")
    print("=" * 60)
    print()

    # 1. 创建工作流引擎
    print("1. 创建工作流引擎...")
    engine = WorkflowEngine()
    
    # 2. 注册节点执行器
    print("2. 注册节点执行器...")
    engine.register_executor("input", SimpleInputExecutor)
    engine.register_executor("transform", SimpleTransformExecutor)
    engine.register_executor("output", SimpleOutputExecutor)
    
    print(f"   已注册的节点类型: {engine.get_registered_node_types()}")
    print()

    # 3. 创建工作流定义
    print("3. 创建工作流定义...")
    workflow = create_simple_workflow()
    print(f"   节点数量: {len(workflow.nodes)}")
    print(f"   边数量: {len(workflow.edges)}")
    print()

    # 4. 准备输入数据
    input_data = {
        "message": "hello world",
        "user": "alice",
        "count": 42,
    }
    print("4. 输入数据:")
    print(f"   {input_data}")
    print()

    # 5. 定义回调函数
    def callback(event):
        """处理执行事件"""
        event_type = event.get("type")
        if event_type == "status":
            print(f"   [状态] {event.get('status')}")
        elif event_type == "node_status":
            print(f"   [节点] {event.get('node_id')}: {event.get('status')}")
        elif event_type == "log":
            level = event.get("level", "info").upper()
            message = event.get("message")
            print(f"   [{level}] {message}")

    # 6. 执行工作流
    print("5. 执行工作流...")
    print()
    
    result = await engine.execute_workflow(
        execution_id="example-exec-001",
        workflow_id="example-workflow-001",
        definition=workflow,
        input_data=input_data,
        callback=callback,
    )

    # 7. 显示结果
    print()
    print("6. 执行结果:")
    print(f"   状态: {result['status']}")
    
    if result["status"] == "completed":
        print(f"   输出: {result['output']}")
        print()
        print("7. 执行摘要:")
        summary = result["summary"]
        print(f"   执行ID: {summary['execution_id']}")
        print(f"   工作流ID: {summary['workflow_id']}")
        print(f"   持续时间: {summary['duration']:.2f}秒")
        print(f"   节点总数: {summary['node_count']}")
        print(f"   成功节点: {summary['completed_nodes']}")
        print(f"   失败节点: {summary['failed_nodes']}")
        print(f"   日志条数: {summary['log_count']}")
    else:
        print(f"   错误: {result.get('error')}")

    print()
    print("=" * 60)
    print("示例完成!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
