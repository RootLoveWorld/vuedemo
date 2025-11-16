"""节点相关的Pydantic schemas"""

from typing import Any, Dict, Optional
from pydantic import BaseModel


class NodeConfig(BaseModel):
    """节点配置基类"""

    type: str
    label: str
    config: Dict[str, Any]


class NodeResult(BaseModel):
    """节点执行结果"""

    node_id: str
    status: str  # success, failed, skipped
    output: Any = None
    error: Optional[str] = None
    execution_time: float = 0.0


class NodeExecutionContext(BaseModel):
    """节点执行上下文"""

    execution_id: str
    workflow_id: str
    node_id: str
    input_data: Dict[str, Any] = {}
    variables: Dict[str, Any] = {}
