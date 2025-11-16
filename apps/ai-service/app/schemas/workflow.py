"""工作流相关的Pydantic schemas"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NodePosition(BaseModel):
    """节点位置"""

    x: float
    y: float


class NodeData(BaseModel):
    """节点数据"""

    label: str
    config: Dict[str, Any] = Field(default_factory=dict)


class FlowNode(BaseModel):
    """流程节点"""

    id: str
    type: str  # input, llm, condition, transform, output, loop, merge
    position: NodePosition
    data: NodeData


class FlowEdge(BaseModel):
    """流程边"""

    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None
    label: Optional[str] = None


class WorkflowDefinition(BaseModel):
    """工作流定义"""

    nodes: List[FlowNode]
    edges: List[FlowEdge]


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
    created_at: str
    updated_at: str
