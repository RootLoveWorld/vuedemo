"""执行相关的Pydantic schemas"""

from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ExecutionCreate(BaseModel):
    """执行请求"""

    execution_id: str
    workflow_id: str
    definition: Dict[str, Any]
    input_data: Dict[str, Any] = Field(default_factory=dict)


class ExecutionResponse(BaseModel):
    """执行响应"""

    id: str
    workflow_id: str
    status: str  # pending, running, completed, failed
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ExecutionStatus(BaseModel):
    """执行状态"""

    execution_id: str
    status: str
    current_node: Optional[str] = None
    progress: float = 0.0
    message: Optional[str] = None


class ExecutionLog(BaseModel):
    """执行日志"""

    execution_id: str
    node_id: Optional[str] = None
    level: str  # info, warning, error
    message: str
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)
