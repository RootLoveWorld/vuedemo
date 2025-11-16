"""输入节点执行器"""

from typing import Any, Dict
import logging

from app.engine.nodes.base import NodeExecutor, NodeExecutionError, NodeValidationError
from app.engine.context import ExecutionContext
from app.schemas.node import NodeResult

logger = logging.getLogger(__name__)


class InputNodeExecutor(NodeExecutor):
    """输入节点执行器
    
    处理工作流的输入数据，支持数据验证和默认值。
    
    配置参数:
    - schema: 输入数据schema（可选）
      定义期望的输入字段和类型
      格式: {"field_name": {"type": "string|number|boolean|object|array", "required": true|false}}
    
    - defaults: 默认值（可选）
      当输入数据中缺少某些字段时使用的默认值
      格式: {"field_name": default_value}
    
    - extract_field: 提取特定字段（可选）
      如果指定，只提取输入数据中的特定字段
    
    - validate: 是否验证输入（可选，默认false）
    
    示例配置:
    1. 基本输入（直接传递所有输入数据）:
    {
        "validate": false
    }
    
    2. 带验证和默认值:
    {
        "validate": true,
        "schema": {
            "name": {"type": "string", "required": true},
            "age": {"type": "number", "required": false},
            "email": {"type": "string", "required": false}
        },
        "defaults": {
            "age": 0,
            "email": "unknown@example.com"
        }
    }
    
    3. 提取特定字段:
    {
        "extract_field": "user_data"
    }
    """

    VALID_TYPES = ["string", "number", "boolean", "object", "array", "null"]

    def __init__(self, node_id: str):
        """初始化输入节点执行器
        
        Args:
            node_id: 节点ID
        """
        super().__init__(node_id, "input")

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """验证节点配置
        
        Args:
            config: 节点配置
            
        Returns:
            bool: 配置是否有效
            
        Raises:
            NodeValidationError: 验证错误
        """
        # 验证schema（如果存在）
        if "schema" in config:
            schema = config["schema"]
            
            if not isinstance(schema, dict):
                raise NodeValidationError("schema must be a dictionary")
            
            for field_name, field_spec in schema.items():
                if not isinstance(field_spec, dict):
                    raise NodeValidationError(
                        f"Schema for field '{field_name}' must be a dictionary"
                    )
                
                # 验证类型
                if "type" in field_spec:
                    field_type = field_spec["type"]
                    if field_type not in self.VALID_TYPES:
                        raise NodeValidationError(
                            f"Invalid type '{field_type}' for field '{field_name}'. "
                            f"Valid types: {', '.join(self.VALID_TYPES)}"
                        )
                
                # 验证required
                if "required" in field_spec:
                    if not isinstance(field_spec["required"], bool):
                        raise NodeValidationError(
                            f"'required' for field '{field_name}' must be a boolean"
                        )
        
        # 验证defaults（如果存在）
        if "defaults" in config:
            defaults = config["defaults"]
            if not isinstance(defaults, dict):
                raise NodeValidationError("defaults must be a dictionary")
        
        # 验证extract_field（如果存在）
        if "extract_field" in config:
            extract_field = config["extract_field"]
            if not isinstance(extract_field, str) or not extract_field.strip():
                raise NodeValidationError("extract_field must be a non-empty string")
        
        # 验证validate标志
        if "validate" in config:
            if not isinstance(config["validate"], bool):
                raise NodeValidationError("validate must be a boolean")
        
        return True

    async def execute(
        self,
        node_config: Dict[str, Any],
        context: ExecutionContext,
    ) -> NodeResult:
        """执行输入节点
        
        Args:
            node_config: 节点配置
            context: 执行上下文
            
        Returns:
            NodeResult: 节点执行结果
            
        Raises:
            NodeExecutionError: 执行错误
        """
        try:
            # 获取输入数据
            input_data = context.input_data
            
            self.log_info(
                f"Processing input data, type: {type(input_data).__name__}",
                context
            )
            
            # 提取特定字段（如果配置）
            if "extract_field" in node_config:
                extract_field = node_config["extract_field"]
                
                if isinstance(input_data, dict) and extract_field in input_data:
                    input_data = input_data[extract_field]
                    self.log_info(
                        f"Extracted field '{extract_field}' from input",
                        context
                    )
                else:
                    self.log_warning(
                        f"Field '{extract_field}' not found in input data",
                        context
                    )
            
            # 应用默认值
            if "defaults" in node_config and isinstance(input_data, dict):
                defaults = node_config["defaults"]
                output_data = {**defaults, **input_data}
                
                applied_defaults = [
                    key for key in defaults.keys() if key not in input_data
                ]
                
                if applied_defaults:
                    self.log_info(
                        f"Applied default values for fields: {', '.join(applied_defaults)}",
                        context
                    )
            else:
                output_data = input_data
            
            # 验证输入（如果配置）
            if node_config.get("validate", False) and "schema" in node_config:
                self._validate_input(output_data, node_config["schema"], context)
            
            self.log_info(
                f"Input processing completed",
                context
            )
            
            return NodeResult(
                node_id=self.node_id,
                status="success",
                output=output_data,
            )
            
        except NodeExecutionError:
            raise
        except Exception as e:
            error_msg = f"Unexpected error in input node: {str(e)}"
            self.log_error(error_msg, context)
            raise NodeExecutionError(error_msg) from e

    def _validate_input(
        self,
        data: Any,
        schema: Dict[str, Dict[str, Any]],
        context: ExecutionContext,
    ) -> None:
        """验证输入数据
        
        Args:
            data: 输入数据
            schema: 数据schema
            context: 执行上下文
            
        Raises:
            NodeExecutionError: 验证失败
        """
        if not isinstance(data, dict):
            raise NodeExecutionError(
                f"Input validation requires dict data, got {type(data).__name__}"
            )
        
        errors = []
        
        # 验证每个字段
        for field_name, field_spec in schema.items():
            # 检查必需字段
            if field_spec.get("required", False) and field_name not in data:
                errors.append(f"Required field '{field_name}' is missing")
                continue
            
            # 如果字段不存在且不是必需的，跳过
            if field_name not in data:
                continue
            
            field_value = data[field_name]
            
            # 验证类型
            if "type" in field_spec:
                expected_type = field_spec["type"]
                actual_type = self._get_value_type(field_value)
                
                if actual_type != expected_type:
                    errors.append(
                        f"Field '{field_name}' has wrong type: "
                        f"expected {expected_type}, got {actual_type}"
                    )
        
        # 如果有验证错误，抛出异常
        if errors:
            error_msg = "Input validation failed:\n" + "\n".join(f"  - {e}" for e in errors)
            self.log_error(error_msg, context)
            raise NodeExecutionError(error_msg)
        
        self.log_info(
            f"Input validation passed for {len(schema)} fields",
            context
        )

    def _get_value_type(self, value: Any) -> str:
        """获取值的类型名称
        
        Args:
            value: 值
            
        Returns:
            类型名称
        """
        if value is None:
            return "null"
        elif isinstance(value, bool):
            return "boolean"
        elif isinstance(value, int) or isinstance(value, float):
            return "number"
        elif isinstance(value, str):
            return "string"
        elif isinstance(value, list):
            return "array"
        elif isinstance(value, dict):
            return "object"
        else:
            return "unknown"
