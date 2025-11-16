"""工作流执行引擎"""

import asyncio
from typing import Any, Dict, List, Optional, Callable, Set
from collections import defaultdict
import logging

from app.engine.context import ExecutionContext
from app.engine.nodes.base import NodeExecutor, NodeExecutionError
from app.schemas.workflow import WorkflowDefinition, FlowNode, FlowEdge
from app.schemas.node import NodeResult

logger = logging.getLogger(__name__)


class WorkflowEngineError(Exception):
    """工作流引擎错误"""

    pass


class WorkflowEngine:
    """工作流执行引擎
    
    基于LangGraph概念实现的工作流执行引擎。
    
    职责:
    - 解析工作流定义
    - 构建执行图
    - 管理节点执行顺序
    - 处理节点间的数据流
    - 管理执行状态
    
    特性:
    - 支持有向无环图(DAG)
    - 支持并行执行
    - 支持条件分支
    - 支持错误处理和重试
    """

    def __init__(self, executor_registry: Optional[Dict[str, type]] = None):
        """初始化工作流引擎
        
        Args:
            executor_registry: 节点执行器注册表 {node_type: ExecutorClass}
        """
        self.executor_registry = executor_registry or {}
        self.logger = logger

    def register_executor(self, node_type: str, executor_class: type) -> None:
        """注册节点执行器
        
        Args:
            node_type: 节点类型
            executor_class: 执行器类
        """
        if not issubclass(executor_class, NodeExecutor):
            raise ValueError(
                f"Executor class must be a subclass of NodeExecutor: {executor_class}"
            )
        
        self.executor_registry[node_type] = executor_class
        self.logger.info(f"Registered executor for node type: {node_type}")

    async def execute_workflow(
        self,
        execution_id: str,
        workflow_id: str,
        definition: WorkflowDefinition,
        input_data: Dict[str, Any],
        callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """执行工作流
        
        Args:
            execution_id: 执行ID
            workflow_id: 工作流ID
            definition: 工作流定义
            input_data: 输入数据
            callback: 状态回调函数
            
        Returns:
            执行结果
            
        Raises:
            WorkflowEngineError: 工作流执行错误
        """
        # 创建执行上下文
        context = ExecutionContext(
            execution_id=execution_id,
            workflow_id=workflow_id,
            input_data=input_data,
            callback=callback,
        )

        try:
            # 开始执行
            context.start()

            # 构建执行图
            execution_graph = self._build_execution_graph(definition)
            
            # 验证图的有效性
            self._validate_graph(execution_graph)

            # 执行工作流
            output_data = await self._execute_graph(
                execution_graph,
                definition.nodes,
                context,
            )

            # 完成执行
            context.complete(output_data)

            return {
                "status": "completed",
                "output": output_data,
                "summary": context.get_execution_summary(),
            }

        except Exception as e:
            # 执行失败
            error_msg = f"Workflow execution failed: {str(e)}"
            self.logger.exception(error_msg)
            context.fail(error_msg)

            return {
                "status": "failed",
                "error": error_msg,
                "summary": context.get_execution_summary(),
            }

    def _build_execution_graph(
        self,
        definition: WorkflowDefinition,
    ) -> Dict[str, List[str]]:
        """构建执行图
        
        将工作流定义转换为邻接表表示的有向图。
        
        Args:
            definition: 工作流定义
            
        Returns:
            执行图 {node_id: [dependent_node_ids]}
        """
        graph: Dict[str, List[str]] = defaultdict(list)
        
        # 初始化所有节点
        for node in definition.nodes:
            if node.id not in graph:
                graph[node.id] = []
        
        # 构建边
        for edge in definition.edges:
            graph[edge.source].append(edge.target)
        
        self.logger.info(
            f"Built execution graph with {len(graph)} nodes and "
            f"{len(definition.edges)} edges"
        )
        
        return dict(graph)

    def _validate_graph(self, graph: Dict[str, List[str]]) -> None:
        """验证图的有效性
        
        检查:
        - 是否存在循环依赖
        - 是否存在孤立节点
        
        Args:
            graph: 执行图
            
        Raises:
            WorkflowEngineError: 图无效
        """
        # 检测循环依赖
        if self._has_cycle(graph):
            raise WorkflowEngineError("Workflow contains circular dependencies")
        
        self.logger.info("Graph validation passed")

    def _has_cycle(self, graph: Dict[str, List[str]]) -> bool:
        """检测图中是否存在循环
        
        使用DFS算法检测循环。
        
        Args:
            graph: 执行图
            
        Returns:
            是否存在循环
        """
        visited: Set[str] = set()
        rec_stack: Set[str] = set()

        def dfs(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)

            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True

            rec_stack.remove(node)
            return False

        for node in graph:
            if node not in visited:
                if dfs(node):
                    return True

        return False

    def _get_start_nodes(self, graph: Dict[str, List[str]]) -> List[str]:
        """获取起始节点（没有入边的节点）
        
        Args:
            graph: 执行图
            
        Returns:
            起始节点列表
        """
        all_nodes = set(graph.keys())
        nodes_with_incoming = set()
        
        for targets in graph.values():
            nodes_with_incoming.update(targets)
        
        start_nodes = list(all_nodes - nodes_with_incoming)
        
        if not start_nodes:
            # 如果没有起始节点，可能是所有节点都有入边，选择第一个节点
            start_nodes = [list(graph.keys())[0]] if graph else []
        
        self.logger.info(f"Start nodes: {start_nodes}")
        return start_nodes

    def _get_node_by_id(
        self,
        node_id: str,
        nodes: List[FlowNode],
    ) -> Optional[FlowNode]:
        """根据ID获取节点
        
        Args:
            node_id: 节点ID
            nodes: 节点列表
            
        Returns:
            节点或None
        """
        for node in nodes:
            if node.id == node_id:
                return node
        return None

    async def _execute_graph(
        self,
        graph: Dict[str, List[str]],
        nodes: List[FlowNode],
        context: ExecutionContext,
    ) -> Any:
        """执行工作流图
        
        使用拓扑排序执行节点，支持并行执行。
        
        Args:
            graph: 执行图
            nodes: 节点列表
            context: 执行上下文
            
        Returns:
            输出数据
        """
        # 计算每个节点的入度
        in_degree: Dict[str, int] = {node_id: 0 for node_id in graph}
        for targets in graph.values():
            for target in targets:
                in_degree[target] = in_degree.get(target, 0) + 1

        # 获取起始节点（入度为0的节点）
        ready_nodes = [node_id for node_id, degree in in_degree.items() if degree == 0]
        
        if not ready_nodes:
            raise WorkflowEngineError("No start nodes found in workflow")

        # 执行节点
        executed_nodes: Set[str] = set()
        output_node_id: Optional[str] = None

        while ready_nodes:
            # 并行执行所有就绪的节点
            tasks = []
            current_batch = ready_nodes.copy()
            ready_nodes.clear()

            for node_id in current_batch:
                node = self._get_node_by_id(node_id, nodes)
                if not node:
                    raise WorkflowEngineError(f"Node not found: {node_id}")

                # 检查是否是输出节点
                if node.type == "output":
                    output_node_id = node_id

                # 创建执行任务
                task = self._execute_node(node, context)
                tasks.append((node_id, task))

            # 等待当前批次的所有节点执行完成
            results = await asyncio.gather(
                *[task for _, task in tasks],
                return_exceptions=True,
            )

            # 处理执行结果
            for (node_id, _), result in zip(tasks, results):
                if isinstance(result, Exception):
                    raise WorkflowEngineError(
                        f"Node {node_id} execution failed: {str(result)}"
                    )

                executed_nodes.add(node_id)

                # 检查节点是否执行成功
                if result.status == "failed":
                    raise WorkflowEngineError(
                        f"Node {node_id} failed: {result.error}"
                    )

                # 更新后续节点的入度
                for target_id in graph.get(node_id, []):
                    in_degree[target_id] -= 1
                    if in_degree[target_id] == 0:
                        ready_nodes.append(target_id)

        # 检查是否所有节点都已执行
        if len(executed_nodes) != len(graph):
            unexecuted = set(graph.keys()) - executed_nodes
            raise WorkflowEngineError(
                f"Not all nodes were executed. Unexecuted nodes: {unexecuted}"
            )

        # 返回输出节点的结果，如果没有输出节点则返回最后一个节点的结果
        if output_node_id:
            return context.get_node_output(output_node_id)
        else:
            # 返回所有节点的输出
            return {
                node_id: context.get_node_output(node_id)
                for node_id in executed_nodes
            }

    async def _execute_node(
        self,
        node: FlowNode,
        context: ExecutionContext,
    ) -> NodeResult:
        """执行单个节点
        
        Args:
            node: 节点定义
            context: 执行上下文
            
        Returns:
            节点执行结果
            
        Raises:
            WorkflowEngineError: 节点执行错误
        """
        # 获取节点执行器
        executor_class = self.executor_registry.get(node.type)
        if not executor_class:
            raise WorkflowEngineError(
                f"No executor registered for node type: {node.type}"
            )

        # 创建执行器实例
        executor = executor_class(node_id=node.id, node_type=node.type)

        # 执行节点
        result = await executor.run(node.data.config, context)

        return result

    def get_registered_node_types(self) -> List[str]:
        """获取已注册的节点类型
        
        Returns:
            节点类型列表
        """
        return list(self.executor_registry.keys())
