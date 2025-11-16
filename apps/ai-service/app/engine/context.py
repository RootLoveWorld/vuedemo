"""执行上下文管理"""

import re
from typing import Any, Dict, Optional, Callable
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ExecutionContext:
    """工作流执行上下文
    
    管理工作流执行过程中的状态、数据传递和变量解析。
    
    职责:
    - 管理执行状态
    - 实现节点间数据传递
    - 实现变量解析和替换
    - 存储执行历史
    """

    def __init__(
        self,
        execution_id: str,
        workflow_id: str,
        input_data: Dict[str, Any],
        callback: Optional[Callable] = None,
    ):
        """初始化执行上下文
        
        Args:
            execution_id: 执行ID
            workflow_id: 工作流ID
            input_data: 输入数据
            callback: 状态回调函数
        """
        self.execution_id = execution_id
        self.workflow_id = workflow_id
        self.input_data = input_data
        self.callback = callback

        # 执行状态
        self.status = "pending"
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.error: Optional[str] = None

        # 变量存储
        self.variables: Dict[str, Any] = {}
        
        # 节点输出存储 {node_id: output}
        self.node_outputs: Dict[str, Any] = {}
        
        # 节点状态存储 {node_id: status}
        self.node_statuses: Dict[str, str] = {}
        
        # 执行日志
        self.logs: list[Dict[str, Any]] = []

        # 初始化输入变量
        self.variables["input"] = input_data

        logger.info(
            f"ExecutionContext initialized: execution_id={execution_id}, "
            f"workflow_id={workflow_id}"
        )

    def set_variable(self, key: str, value: Any) -> None:
        """设置变量
        
        Args:
            key: 变量名
            value: 变量值
        """
        self.variables[key] = value
        logger.debug(f"Variable set: {key} = {value}")

    def get_variable(self, key: str, default: Any = None) -> Any:
        """获取变量
        
        Args:
            key: 变量名
            default: 默认值
            
        Returns:
            变量值
        """
        return self.variables.get(key, default)

    def set_node_output(self, node_id: str, output: Any) -> None:
        """设置节点输出
        
        Args:
            node_id: 节点ID
            output: 输出数据
        """
        self.node_outputs[node_id] = output
        self.variables[f"nodes.{node_id}"] = output
        logger.debug(f"Node output set: {node_id}")

    def get_node_output(self, node_id: str, default: Any = None) -> Any:
        """获取节点输出
        
        Args:
            node_id: 节点ID
            default: 默认值
            
        Returns:
            节点输出数据
        """
        return self.node_outputs.get(node_id, default)

    def set_node_status(self, node_id: str, status: str) -> None:
        """设置节点状态
        
        Args:
            node_id: 节点ID
            status: 状态 (pending, running, success, failed, skipped)
        """
        self.node_statuses[node_id] = status
        logger.debug(f"Node status set: {node_id} = {status}")
        
        # 触发回调
        if self.callback:
            self.callback({
                "type": "node_status",
                "execution_id": self.execution_id,
                "node_id": node_id,
                "status": status,
            })

    def get_node_status(self, node_id: str) -> Optional[str]:
        """获取节点状态
        
        Args:
            node_id: 节点ID
            
        Returns:
            节点状态
        """
        return self.node_statuses.get(node_id)

    def resolve_variables(self, text: str) -> str:
        """解析变量引用
        
        支持的变量格式:
        - {{input.field}}: 输入数据字段
        - {{nodes.node_id.field}}: 节点输出字段
        - {{variables.var_name}}: 自定义变量
        
        Args:
            text: 包含变量引用的文本
            
        Returns:
            解析后的文本
        """
        if not isinstance(text, str):
            return text

        # 匹配 {{variable}} 格式
        pattern = r'\{\{([^}]+)\}\}'
        
        def replace_var(match):
            var_path = match.group(1).strip()
            value = self._get_nested_value(var_path)
            return str(value) if value is not None else match.group(0)
        
        result = re.sub(pattern, replace_var, text)
        return result

    def _get_nested_value(self, path: str) -> Any:
        """获取嵌套路径的值
        
        Args:
            path: 点分隔的路径，如 "input.user.name"
            
        Returns:
            值或None
        """
        parts = path.split(".")
        value = self.variables
        
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            else:
                return None
            
            if value is None:
                return None
        
        return value

    def add_log(
        self,
        level: str,
        message: str,
        node_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """添加执行日志
        
        Args:
            level: 日志级别 (info, warning, error)
            message: 日志消息
            node_id: 节点ID
            metadata: 额外元数据
        """
        log_entry = {
            "execution_id": self.execution_id,
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message,
            "node_id": node_id,
            "metadata": metadata or {},
        }
        
        self.logs.append(log_entry)
        
        # 触发回调
        if self.callback:
            self.callback({
                "type": "log",
                **log_entry,
            })
        
        # 同时记录到logger
        log_method = getattr(logger, level.lower(), logger.info)
        log_method(f"[{self.execution_id}] {message}")

    def start(self) -> None:
        """开始执行"""
        self.status = "running"
        self.started_at = datetime.now()
        self.add_log("info", "Workflow execution started")
        
        if self.callback:
            self.callback({
                "type": "status",
                "execution_id": self.execution_id,
                "status": "running",
            })

    def complete(self, output_data: Any) -> None:
        """完成执行
        
        Args:
            output_data: 输出数据
        """
        self.status = "completed"
        self.completed_at = datetime.now()
        self.variables["output"] = output_data
        self.add_log("info", "Workflow execution completed")
        
        if self.callback:
            self.callback({
                "type": "status",
                "execution_id": self.execution_id,
                "status": "completed",
                "output": output_data,
            })

    def fail(self, error: str) -> None:
        """执行失败
        
        Args:
            error: 错误信息
        """
        self.status = "failed"
        self.completed_at = datetime.now()
        self.error = error
        self.add_log("error", f"Workflow execution failed: {error}")
        
        if self.callback:
            self.callback({
                "type": "status",
                "execution_id": self.execution_id,
                "status": "failed",
                "error": error,
            })

    def get_execution_summary(self) -> Dict[str, Any]:
        """获取执行摘要
        
        Returns:
            执行摘要信息
        """
        duration = None
        if self.started_at and self.completed_at:
            duration = (self.completed_at - self.started_at).total_seconds()
        
        return {
            "execution_id": self.execution_id,
            "workflow_id": self.workflow_id,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration": duration,
            "error": self.error,
            "node_count": len(self.node_statuses),
            "completed_nodes": sum(
                1 for s in self.node_statuses.values() if s == "success"
            ),
            "failed_nodes": sum(
                1 for s in self.node_statuses.values() if s == "failed"
            ),
            "log_count": len(self.logs),
        }
