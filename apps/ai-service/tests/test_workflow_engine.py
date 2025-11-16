"""工作流引擎测试"""

import pytest
from typing import Any, Dict

from app.engine import (
    WorkflowEngine,
    ExecutionContext,
    NodeExecutor,
    NodeExecutionError,
)
from app.schemas.workflow import WorkflowDefinition, FlowNode, FlowEdge, NodeData, NodePosition
from app.schemas.node import NodeResult


class MockInputExecutor(NodeExecutor):
    """模拟输入节点执行器"""

    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        # 返回输入数据
        return NodeResult(
            node_id=self.node_id,
            status="success",
            output=context.input_data,
        )

    def validate_config(self, config: Dict[str, Any]) -> bool:
        return True


class MockTransformExecutor(NodeExecutor):
    """模拟转换节点执行器"""

    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        # 获取前一个节点的输出
        input_data = self.get_input_from_context(context, config.get("source_node"))
        
        # 简单转换：添加一个字段
        output = {**input_data, "transformed": True}
        
        return NodeResult(
            node_id=self.node_id,
            status="success",
            output=output,
        )

    def validate_config(self, config: Dict[str, Any]) -> bool:
        return True


class MockOutputExecutor(NodeExecutor):
    """模拟输出节点执行器"""

    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        # 获取前一个节点的输出
        input_data = self.get_input_from_context(context, config.get("source_node"))
        
        return NodeResult(
            node_id=self.node_id,
            status="success",
            output=input_data,
        )

    def validate_config(self, config: Dict[str, Any]) -> bool:
        return True


@pytest.fixture
def workflow_engine():
    """创建工作流引擎实例"""
    engine = WorkflowEngine()
    engine.register_executor("input", MockInputExecutor)
    engine.register_executor("transform", MockTransformExecutor)
    engine.register_executor("output", MockOutputExecutor)
    return engine


@pytest.fixture
def simple_workflow():
    """创建简单的线性工作流"""
    return WorkflowDefinition(
        nodes=[
            FlowNode(
                id="node1",
                type="input",
                position=NodePosition(x=0, y=0),
                data=NodeData(label="Input", config={}),
            ),
            FlowNode(
                id="node2",
                type="transform",
                position=NodePosition(x=100, y=0),
                data=NodeData(label="Transform", config={"source_node": "node1"}),
            ),
            FlowNode(
                id="node3",
                type="output",
                position=NodePosition(x=200, y=0),
                data=NodeData(label="Output", config={"source_node": "node2"}),
            ),
        ],
        edges=[
            FlowEdge(id="edge1", source="node1", target="node2"),
            FlowEdge(id="edge2", source="node2", target="node3"),
        ],
    )


@pytest.mark.asyncio
async def test_workflow_engine_initialization(workflow_engine):
    """测试工作流引擎初始化"""
    assert workflow_engine is not None
    assert len(workflow_engine.get_registered_node_types()) == 3
    assert "input" in workflow_engine.get_registered_node_types()
    assert "transform" in workflow_engine.get_registered_node_types()
    assert "output" in workflow_engine.get_registered_node_types()


@pytest.mark.asyncio
async def test_simple_workflow_execution(workflow_engine, simple_workflow):
    """测试简单工作流执行"""
    input_data = {"message": "Hello, World!"}
    
    result = await workflow_engine.execute_workflow(
        execution_id="test-exec-1",
        workflow_id="test-workflow-1",
        definition=simple_workflow,
        input_data=input_data,
    )
    
    assert result["status"] == "completed"
    assert result["output"] is not None
    assert result["output"]["message"] == "Hello, World!"
    assert result["output"]["transformed"] is True


@pytest.mark.asyncio
async def test_execution_context():
    """测试执行上下文"""
    context = ExecutionContext(
        execution_id="test-exec-1",
        workflow_id="test-workflow-1",
        input_data={"key": "value"},
    )
    
    # 测试变量设置和获取
    context.set_variable("test_var", "test_value")
    assert context.get_variable("test_var") == "test_value"
    
    # 测试节点输出
    context.set_node_output("node1", {"output": "data"})
    assert context.get_node_output("node1") == {"output": "data"}
    
    # 测试节点状态
    context.set_node_status("node1", "success")
    assert context.get_node_status("node1") == "success"
    
    # 测试变量解析
    context.set_variable("user", {"name": "Alice"})
    resolved = context.resolve_variables("Hello {{user.name}}!")
    assert resolved == "Hello Alice!"


@pytest.mark.asyncio
async def test_execution_context_variable_resolution():
    """测试执行上下文变量解析"""
    context = ExecutionContext(
        execution_id="test-exec-1",
        workflow_id="test-workflow-1",
        input_data={"user": {"name": "Bob", "age": 30}},
    )
    
    # 测试输入数据解析
    resolved = context.resolve_variables("User: {{input.user.name}}, Age: {{input.user.age}}")
    assert resolved == "User: Bob, Age: 30"
    
    # 测试节点输出解析
    context.set_node_output("node1", {"result": "success"})
    resolved = context.resolve_variables("Result: {{nodes.node1.result}}")
    assert resolved == "Result: success"


@pytest.mark.asyncio
async def test_graph_validation_cycle_detection(workflow_engine):
    """测试图验证 - 循环检测"""
    # 创建包含循环的工作流
    cyclic_workflow = WorkflowDefinition(
        nodes=[
            FlowNode(
                id="node1",
                type="input",
                position=NodePosition(x=0, y=0),
                data=NodeData(label="Input", config={}),
            ),
            FlowNode(
                id="node2",
                type="transform",
                position=NodePosition(x=100, y=0),
                data=NodeData(label="Transform", config={}),
            ),
        ],
        edges=[
            FlowEdge(id="edge1", source="node1", target="node2"),
            FlowEdge(id="edge2", source="node2", target="node1"),  # 循环
        ],
    )
    
    result = await workflow_engine.execute_workflow(
        execution_id="test-exec-cycle",
        workflow_id="test-workflow-cycle",
        definition=cyclic_workflow,
        input_data={},
    )
    
    assert result["status"] == "failed"
    assert "circular dependencies" in result["error"].lower()


@pytest.mark.asyncio
async def test_node_executor_error_handling():
    """测试节点执行器错误处理"""
    
    class FailingExecutor(NodeExecutor):
        async def execute(self, node_config, context):
            raise NodeExecutionError("Intentional failure")
        
        def validate_config(self, config):
            return True
    
    engine = WorkflowEngine()
    engine.register_executor("failing", FailingExecutor)
    
    workflow = WorkflowDefinition(
        nodes=[
            FlowNode(
                id="node1",
                type="failing",
                position=NodePosition(x=0, y=0),
                data=NodeData(label="Failing Node", config={}),
            ),
        ],
        edges=[],
    )
    
    result = await engine.execute_workflow(
        execution_id="test-exec-fail",
        workflow_id="test-workflow-fail",
        definition=workflow,
        input_data={},
    )
    
    assert result["status"] == "failed"
    assert "Intentional failure" in result["error"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
