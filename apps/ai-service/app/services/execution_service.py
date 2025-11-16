"""执行服务"""

import asyncio
from typing import Any, Dict, Optional, Callable
from datetime import datetime
import logging

from app.engine.workflow_engine import WorkflowEngine, WorkflowEngineError
from app.engine.nodes import (
    LLMNodeExecutor,
    ConditionNodeExecutor,
    TransformNodeExecutor,
    InputNodeExecutor,
    OutputNodeExecutor,
)
from app.services.ollama_service import OllamaService
from app.schemas.workflow import WorkflowDefinition
from app.schemas.execution import ExecutionStatus, ExecutionLog

logger = logging.getLogger(__name__)


class ExecutionServiceError(Exception):
    """执行服务错误"""

    pass


class ExecutionService:
    """执行服务
    
    负责管理工作流执行的生命周期:
    - 触发工作流执行
    - 管理执行状态
    - 记录执行日志
    - 处理执行控制（暂停、恢复、停止）
    """

    def __init__(self, ollama_service: Optional[OllamaService] = None):
        """初始化执行服务
        
        Args:
            ollama_service: Ollama服务实例
        """
        self.ollama_service = ollama_service or OllamaService()
        self.workflow_engine = self._create_workflow_engine()
        
        # 执行状态存储 {execution_id: status}
        self.executions: Dict[str, Dict[str, Any]] = {}
        
        # 执行日志存储 {execution_id: [logs]}
        self.execution_logs: Dict[str, list] = {}
        
        # 执行任务存储 {execution_id: Task}
        self.execution_tasks: Dict[str, asyncio.Task] = {}
        
        # 执行控制标志 {execution_id: {"paused": bool, "stopped": bool}}
        self.execution_controls: Dict[str, Dict[str, bool]] = {}
        
        self.logger = logger

    def _create_workflow_engine(self) -> WorkflowEngine:
        """创建工作流引擎并注册节点执行器
        
        Returns:
            配置好的工作流引擎
        """
        engine = WorkflowEngine()
        
        # 注册内置节点执行器
        engine.register_executor("input", InputNodeExecutor)
        engine.register_executor("llm", LLMNodeExecutor)
        engine.register_executor("condition", ConditionNodeExecutor)
        engine.register_executor("transform", TransformNodeExecutor)
        engine.register_executor("output", OutputNodeExecutor)
        
        self.logger.info("Workflow engine created with registered executors")
        return engine

    async def execute_workflow(
        self,
        execution_id: str,
        workflow_id: str,
        definition: Dict[str, Any],
        input_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """触发工作流执行（异步）
        
        Args:
            execution_id: 执行ID
            workflow_id: 工作流ID
            definition: 工作流定义
            input_data: 输入数据
            
        Returns:
            执行初始状态
        """
        # 验证工作流定义
        try:
            workflow_def = WorkflowDefinition(**definition)
        except Exception as e:
            raise ExecutionServiceError(f"Invalid workflow definition: {str(e)}")

        # 初始化执行状态
        self.executions[execution_id] = {
            "execution_id": execution_id,
            "workflow_id": workflow_id,
            "status": "pending",
            "input_data": input_data,
            "output_data": None,
            "error_message": None,
            "started_at": None,
            "completed_at": None,
            "current_node": None,
            "progress": 0.0,
        }
        
        # 初始化日志
        self.execution_logs[execution_id] = []
        
        # 初始化控制标志
        self.execution_controls[execution_id] = {
            "paused": False,
            "stopped": False,
        }
        
        # 记录日志
        self._add_log(
            execution_id,
            "info",
            f"Execution {execution_id} created for workflow {workflow_id}",
        )

        # 创建异步执行任务
        task = asyncio.create_task(
            self._execute_workflow_async(
                execution_id,
                workflow_id,
                workflow_def,
                input_data,
            )
        )
        self.execution_tasks[execution_id] = task

        return self.executions[execution_id]

    async def _execute_workflow_async(
        self,
        execution_id: str,
        workflow_id: str,
        definition: WorkflowDefinition,
        input_data: Dict[str, Any],
    ) -> None:
        """异步执行工作流
        
        Args:
            execution_id: 执行ID
            workflow_id: 工作流ID
            definition: 工作流定义
            input_data: 输入数据
        """
        try:
            # 更新状态为running
            self._update_status(execution_id, "running")
            self.executions[execution_id]["started_at"] = datetime.now().isoformat()
            
            self._add_log(
                execution_id,
                "info",
                f"Starting workflow execution with {len(definition.nodes)} nodes",
            )

            # 创建状态回调函数
            def status_callback(node_id: str, status: str, data: Any = None):
                """节点状态回调"""
                self.executions[execution_id]["current_node"] = node_id
                self._add_log(
                    execution_id,
                    "info",
                    f"Node {node_id} status: {status}",
                    metadata={"node_id": node_id, "data": data},
                )

            # 执行工作流
            result = await self.workflow_engine.execute_workflow(
                execution_id=execution_id,
                workflow_id=workflow_id,
                definition=definition,
                input_data=input_data,
                callback=status_callback,
            )

            # 检查是否被停止
            if self.execution_controls[execution_id]["stopped"]:
                self._update_status(execution_id, "stopped")
                self.executions[execution_id]["completed_at"] = datetime.now().isoformat()
                self._add_log(execution_id, "info", "Execution stopped by user")
                return

            # 更新执行结果
            if result["status"] == "completed":
                self._update_status(execution_id, "completed")
                self.executions[execution_id]["output_data"] = result["output"]
                self.executions[execution_id]["progress"] = 1.0
                self._add_log(execution_id, "info", "Workflow execution completed successfully")
            else:
                self._update_status(execution_id, "failed")
                self.executions[execution_id]["error_message"] = result.get("error")
                self._add_log(
                    execution_id,
                    "error",
                    f"Workflow execution failed: {result.get('error')}",
                )

            self.executions[execution_id]["completed_at"] = datetime.now().isoformat()

        except Exception as e:
            # 处理执行错误
            error_msg = f"Workflow execution error: {str(e)}"
            self.logger.exception(error_msg)
            
            self._update_status(execution_id, "failed")
            self.executions[execution_id]["error_message"] = error_msg
            self.executions[execution_id]["completed_at"] = datetime.now().isoformat()
            
            self._add_log(execution_id, "error", error_msg)

        finally:
            # 清理执行任务
            if execution_id in self.execution_tasks:
                del self.execution_tasks[execution_id]

    def _update_status(self, execution_id: str, status: str) -> None:
        """更新执行状态
        
        Args:
            execution_id: 执行ID
            status: 新状态
        """
        if execution_id in self.executions:
            self.executions[execution_id]["status"] = status
            self.logger.info(f"Execution {execution_id} status updated to {status}")

    def _add_log(
        self,
        execution_id: str,
        level: str,
        message: str,
        node_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """添加执行日志
        
        Args:
            execution_id: 执行ID
            level: 日志级别
            message: 日志消息
            node_id: 节点ID
            metadata: 元数据
        """
        if execution_id not in self.execution_logs:
            self.execution_logs[execution_id] = []

        log_entry = {
            "execution_id": execution_id,
            "node_id": node_id,
            "level": level,
            "message": message,
            "metadata": metadata,
            "timestamp": datetime.now().isoformat(),
        }
        
        self.execution_logs[execution_id].append(log_entry)
        
        # 同时记录到日志系统
        log_method = getattr(self.logger, level, self.logger.info)
        log_method(f"[{execution_id}] {message}", extra={"metadata": metadata})

    def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """获取执行状态
        
        Args:
            execution_id: 执行ID
            
        Returns:
            执行状态或None
        """
        return self.executions.get(execution_id)

    def get_execution_logs(
        self,
        execution_id: str,
        level: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> list:
        """获取执行日志
        
        Args:
            execution_id: 执行ID
            level: 日志级别过滤
            limit: 返回数量限制
            
        Returns:
            日志列表
        """
        logs = self.execution_logs.get(execution_id, [])
        
        # 按级别过滤
        if level:
            logs = [log for log in logs if log["level"] == level]
        
        # 限制数量
        if limit:
            logs = logs[-limit:]
        
        return logs

    async def stop_execution(self, execution_id: str) -> bool:
        """停止执行
        
        Args:
            execution_id: 执行ID
            
        Returns:
            是否成功停止
        """
        if execution_id not in self.executions:
            return False

        # 设置停止标志
        if execution_id in self.execution_controls:
            self.execution_controls[execution_id]["stopped"] = True

        # 取消执行任务
        if execution_id in self.execution_tasks:
            task = self.execution_tasks[execution_id]
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        self._update_status(execution_id, "stopped")
        self._add_log(execution_id, "info", "Execution stopped")
        
        return True

    async def pause_execution(self, execution_id: str) -> bool:
        """暂停执行
        
        Args:
            execution_id: 执行ID
            
        Returns:
            是否成功暂停
        """
        if execution_id not in self.executions:
            return False

        if self.executions[execution_id]["status"] != "running":
            return False

        # 设置暂停标志
        if execution_id in self.execution_controls:
            self.execution_controls[execution_id]["paused"] = True

        self._update_status(execution_id, "paused")
        self._add_log(execution_id, "info", "Execution paused")
        
        return True

    async def resume_execution(self, execution_id: str) -> bool:
        """恢复执行
        
        Args:
            execution_id: 执行ID
            
        Returns:
            是否成功恢复
        """
        if execution_id not in self.executions:
            return False

        if self.executions[execution_id]["status"] != "paused":
            return False

        # 清除暂停标志
        if execution_id in self.execution_controls:
            self.execution_controls[execution_id]["paused"] = False

        self._update_status(execution_id, "running")
        self._add_log(execution_id, "info", "Execution resumed")
        
        return True

    async def cleanup(self) -> None:
        """清理资源"""
        # 取消所有运行中的任务
        for task in self.execution_tasks.values():
            if not task.done():
                task.cancel()

        # 关闭Ollama服务
        await self.ollama_service.close()
        
        self.logger.info("Execution service cleaned up")

