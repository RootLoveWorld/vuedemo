"""节点执行器基类"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from datetime import datetime
import logging

from app.engine.context import ExecutionContext
from app.schemas.node import NodeResult

logger = logging.getLogger(__name__)


class NodeExecutionError(Exception):
    """节点执行错误"""

    pass


class NodeValidationError(Exception):
    """节点配置验证错误"""

    pass


class NodeExecutor(ABC):
    """节点执行器抽象基类
    
    所有节点执行器必须继承此类并实现execute和validate_config方法。
    
    职责:
    - 定义执行接口
    - 实现配置验证
    - 实现错误处理
    - 提供通用工具方法
    """

    def __init__(self, node_id: str, node_type: str):
        """初始化节点执行器
        
        Args:
            node_id: 节点ID
            node_type: 节点类型
        """
        self.node_id = node_id
        self.node_type = node_type
        self.logger = logging.getLogger(f"{__name__}.{node_type}")

    @abstractmethod
    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        """执行节点逻辑
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            NodeResult: 节点执行结果
            
        Raises:
            NodeExecutionError: 执行错误
        """
        pass

    @abstractmethod
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """验证节点配置
        
        Args:
            config: 节点配置
            
        Returns:
            bool: 配置是否有效
            
        Raises:
            NodeValidationError: 验证错误
        """
        pass

    async def run(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        """运行节点（包含错误处理和日志）
        
        这是一个模板方法，封装了执行前后的通用逻辑。
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            NodeResult: 节点执行结果
        """
        start_time = datetime.now()
        
        try:
            # 更新节点状态为运行中
            context.set_node_status(self.node_id, "running")
            context.add_log(
                "info",
                f"Node {self.node_id} ({self.node_type}) started",
                node_id=self.node_id,
            )

            # 验证配置
            if not self.validate_config(node_config):
                raise NodeValidationError(
                    f"Invalid configuration for node {self.node_id}"
                )

            # 解析配置中的变量
            resolved_config = self._resolve_config_variables(node_config, context)

            # 执行节点逻辑
            result = await self.execute(resolved_config, context)

            # 计算执行时间
            execution_time = (datetime.now() - start_time).total_seconds()
            result.execution_time = execution_time

            # 更新节点状态
            context.set_node_status(self.node_id, result.status)
            
            # 存储节点输出
            if result.status == "success":
                context.set_node_output(self.node_id, result.output)
                context.add_log(
                    "info",
                    f"Node {self.node_id} completed successfully in {execution_time:.2f}s",
                    node_id=self.node_id,
                    metadata={"execution_time": execution_time},
                )
            else:
                context.add_log(
                    "warning",
                    f"Node {self.node_id} completed with status: {result.status}",
                    node_id=self.node_id,
                )

            return result

        except NodeValidationError as e:
            # 配置验证错误
            error_msg = f"Configuration validation failed: {str(e)}"
            self.logger.error(f"Node {self.node_id}: {error_msg}")
            
            context.set_node_status(self.node_id, "failed")
            context.add_log("error", error_msg, node_id=self.node_id)
            
            return NodeResult(
                node_id=self.node_id,
                status="failed",
                error=error_msg,
                execution_time=(datetime.now() - start_time).total_seconds(),
            )

        except NodeExecutionError as e:
            # 节点执行错误
            error_msg = f"Execution failed: {str(e)}"
            self.logger.error(f"Node {self.node_id}: {error_msg}")
            
            context.set_node_status(self.node_id, "failed")
            context.add_log("error", error_msg, node_id=self.node_id)
            
            return NodeResult(
                node_id=self.node_id,
                status="failed",
                error=error_msg,
                execution_time=(datetime.now() - start_time).total_seconds(),
            )

        except Exception as e:
            # 未预期的错误
            error_msg = f"Unexpected error: {str(e)}"
            self.logger.exception(f"Node {self.node_id}: {error_msg}")
            
            context.set_node_status(self.node_id, "failed")
            context.add_log("error", error_msg, node_id=self.node_id)
            
            return NodeResult(
                node_id=self.node_id,
                status="failed",
                error=error_msg,
                execution_time=(datetime.now() - start_time).total_seconds(),
            )

    def _resolve_config_variables(
        self,
        config: Dict[str, Any],
        context: ExecutionContext,
    ) -> Dict[str, Any]:
        """解析配置中的变量引用
        
        Args:
            config: 原始配置
            context: 执行上下文
            
        Returns:
            解析后的配置
        """
        resolved = {}
        
        for key, value in config.items():
            if isinstance(value, str):
                resolved[key] = context.resolve_variables(value)
            elif isinstance(value, dict):
                resolved[key] = self._resolve_config_variables(value, context)
            elif isinstance(value, list):
                resolved[key] = [
                    context.resolve_variables(item) if isinstance(item, str) else item
                    for item in value
                ]
            else:
                resolved[key] = value
        
        return resolved

    def get_input_from_context(
        self,
        context: ExecutionContext,
        source_node_id: Optional[str] = None,
    ) -> Any:
        """从上下文获取输入数据
        
        Args:
            context: 执行上下文
            source_node_id: 源节点ID，如果为None则使用工作流输入
            
        Returns:
            输入数据
        """
        if source_node_id:
            return context.get_node_output(source_node_id)
        else:
            return context.input_data

    def log_debug(self, message: str, context: ExecutionContext) -> None:
        """记录调试日志
        
        Args:
            message: 日志消息
            context: 执行上下文
        """
        self.logger.debug(f"Node {self.node_id}: {message}")

    def log_info(self, message: str, context: ExecutionContext) -> None:
        """记录信息日志
        
        Args:
            message: 日志消息
            context: 执行上下文
        """
        context.add_log("info", message, node_id=self.node_id)

    def log_warning(self, message: str, context: ExecutionContext) -> None:
        """记录警告日志
        
        Args:
            message: 日志消息
            context: 执行上下文
        """
        context.add_log("warning", message, node_id=self.node_id)

    def log_error(self, message: str, context: ExecutionContext) -> None:
        """记录错误日志
        
        Args:
            message: 日志消息
            context: 执行上下文
        """
        context.add_log("error", message, node_id=self.node_id)
