"""条件节点执行器"""

from typing import Any, Dict
import logging
import operator

from app.engine.nodes.base import NodeExecutor, NodeExecutionError, NodeValidationError
from app.engine.context import ExecutionContext
from app.schemas.node import NodeResult

logger = logging.getLogger(__name__)


class ConditionNodeExecutor(NodeExecutor):
    """条件节点执行器
    
    根据条件表达式评估结果，决定工作流的分支走向。
    
    配置参数:
    - conditions: 条件列表（必需）
      每个条件包含:
      - field: 要比较的字段路径（如 "input.age", "nodes.node1.result"）
      - operator: 比较操作符（eq, ne, gt, gte, lt, lte, contains, in）
      - value: 比较值
      - branch: 满足条件时的分支名称
    - default_branch: 默认分支（可选，当所有条件都不满足时使用）
    
    示例配置:
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
    """

    # 支持的操作符
    OPERATORS = {
        "eq": operator.eq,           # 等于
        "ne": operator.ne,           # 不等于
        "gt": operator.gt,           # 大于
        "gte": operator.ge,          # 大于等于
        "lt": operator.lt,           # 小于
        "lte": operator.le,          # 小于等于
        "contains": lambda a, b: b in a,  # 包含
        "in": lambda a, b: a in b,   # 在...中
    }

    def __init__(self, node_id: str):
        """初始化条件节点执行器
        
        Args:
            node_id: 节点ID
        """
        super().__init__(node_id, "condition")

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """验证节点配置
        
        Args:
            config: 节点配置
            
        Returns:
            bool: 配置是否有效
            
        Raises:
            NodeValidationError: 验证错误
        """
        # 检查必需字段
        if "conditions" not in config:
            raise NodeValidationError("Missing required field: conditions")
        
        conditions = config["conditions"]
        
        # 验证条件列表
        if not isinstance(conditions, list) or len(conditions) == 0:
            raise NodeValidationError("Conditions must be a non-empty list")
        
        # 验证每个条件
        for i, condition in enumerate(conditions):
            if not isinstance(condition, dict):
                raise NodeValidationError(f"Condition {i} must be a dictionary")
            
            # 检查必需字段
            if "field" not in condition:
                raise NodeValidationError(f"Condition {i}: missing field 'field'")
            
            if "operator" not in condition:
                raise NodeValidationError(f"Condition {i}: missing field 'operator'")
            
            if "value" not in condition:
                raise NodeValidationError(f"Condition {i}: missing field 'value'")
            
            if "branch" not in condition:
                raise NodeValidationError(f"Condition {i}: missing field 'branch'")
            
            # 验证操作符
            op = condition["operator"]
            if op not in self.OPERATORS:
                raise NodeValidationError(
                    f"Condition {i}: unsupported operator '{op}'. "
                    f"Supported operators: {', '.join(self.OPERATORS.keys())}"
                )
            
            # 验证分支名称
            branch = condition["branch"]
            if not isinstance(branch, str) or not branch.strip():
                raise NodeValidationError(
                    f"Condition {i}: branch must be a non-empty string"
                )
        
        # 验证默认分支（如果存在）
        if "default_branch" in config:
            default_branch = config["default_branch"]
            if not isinstance(default_branch, str) or not default_branch.strip():
                raise NodeValidationError("default_branch must be a non-empty string")
        
        return True

    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        """执行条件节点
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            NodeResult: 节点执行结果，output包含选中的分支名称
            
        Raises:
            NodeExecutionError: 执行错误
        """
        try:
            conditions = node_config["conditions"]
            default_branch = node_config.get("default_branch")
            
            self.log_info(
                f"Evaluating {len(conditions)} conditions",
                context
            )
            
            # 评估每个条件
            for i, condition in enumerate(conditions):
                field_path = condition["field"]
                op_name = condition["operator"]
                expected_value = condition["value"]
                branch = condition["branch"]
                
                # 获取字段值
                actual_value = self._get_field_value(field_path, context)
                
                # 评估条件
                op_func = self.OPERATORS[op_name]
                
                try:
                    result = op_func(actual_value, expected_value)
                except Exception as e:
                    self.log_warning(
                        f"Condition {i} evaluation error: {str(e)}. "
                        f"Field: {field_path}, Operator: {op_name}, "
                        f"Actual: {actual_value}, Expected: {expected_value}",
                        context
                    )
                    continue
                
                # 记录评估结果
                self.log_debug(
                    f"Condition {i}: {field_path} {op_name} {expected_value} = {result} "
                    f"(actual value: {actual_value})",
                    context
                )
                
                # 如果条件满足，返回对应分支
                if result:
                    self.log_info(
                        f"Condition {i} matched, selecting branch: {branch}",
                        context
                    )
                    
                    return NodeResult(
                        node_id=self.node_id,
                        status="success",
                        output={
                            "branch": branch,
                            "matched_condition": i,
                            "field": field_path,
                            "actual_value": actual_value,
                            "expected_value": expected_value,
                            "operator": op_name,
                        },
                    )
            
            # 所有条件都不满足，使用默认分支
            if default_branch:
                self.log_info(
                    f"No conditions matched, using default branch: {default_branch}",
                    context
                )
                
                return NodeResult(
                    node_id=self.node_id,
                    status="success",
                    output={
                        "branch": default_branch,
                        "matched_condition": None,
                    },
                )
            else:
                # 没有默认分支，返回错误
                error_msg = "No conditions matched and no default branch specified"
                self.log_error(error_msg, context)
                
                raise NodeExecutionError(error_msg)
            
        except NodeExecutionError:
            raise
        except Exception as e:
            error_msg = f"Unexpected error in condition node: {str(e)}"
            self.log_error(error_msg, context)
            raise NodeExecutionError(error_msg) from e

    def _get_field_value(
        self,
        field_path: str,
        context: ExecutionContext,
    ) -> Any:
        """获取字段值
        
        支持的路径格式:
        - input.field: 输入数据字段
        - nodes.node_id.field: 节点输出字段
        - variables.var_name: 自定义变量
        
        Args:
            field_path: 字段路径
            context: 执行上下文
            
        Returns:
            字段值
        """
        # 使用上下文的嵌套值获取方法
        value = context._get_nested_value(field_path)
        
        if value is None:
            self.logger.warning(f"Field not found: {field_path}")
        
        return value

    def evaluate_condition(
        self,
        actual_value: Any,
        operator_name: str,
        expected_value: Any,
    ) -> bool:
        """评估单个条件
        
        Args:
            actual_value: 实际值
            operator_name: 操作符名称
            expected_value: 期望值
            
        Returns:
            bool: 条件是否满足
        """
        if operator_name not in self.OPERATORS:
            raise ValueError(f"Unsupported operator: {operator_name}")
        
        op_func = self.OPERATORS[operator_name]
        
        try:
            return op_func(actual_value, expected_value)
        except Exception as e:
            self.logger.error(
                f"Error evaluating condition: {actual_value} {operator_name} {expected_value}. "
                f"Error: {str(e)}"
            )
            return False
