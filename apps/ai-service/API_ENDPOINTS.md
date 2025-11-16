# AI Service API Endpoints

## 执行API (Execution API)

### POST /api/v1/execute

触发工作流的异步执行

**请求体**:

```json
{
  "execution_id": "string",
  "workflow_id": "string",
  "definition": {
    "nodes": [...],
    "edges": [...]
  },
  "input_data": {}
}
```

**响应** (202 Accepted):

```json
{
  "id": "string",
  "workflow_id": "string",
  "status": "pending",
  "input_data": {},
  "output_data": null,
  "error_message": null,
  "started_at": null,
  "completed_at": null
}
```

---

### GET /api/v1/execute/{execution_id}/status

获取执行状态

**响应**:

```json
{
  "execution_id": "string",
  "status": "running",
  "current_node": "node-id",
  "progress": 0.5,
  "message": null
}
```

**状态值**:

- `pending`: 等待执行
- `running`: 执行中
- `paused`: 已暂停
- `completed`: 已完成
- `failed`: 失败
- `stopped`: 已停止

---

### GET /api/v1/execute/{execution_id}/logs

获取执行日志

**查询参数**:

- `level` (可选): 日志级别过滤 (info, warning, error)
- `limit` (可选): 返回数量限制

**响应**:

```json
{
  "execution_id": "string",
  "logs": [
    {
      "execution_id": "string",
      "node_id": "node-id",
      "level": "info",
      "message": "Log message",
      "metadata": {},
      "timestamp": "2024-01-01T00:00:00"
    }
  ],
  "count": 10
}
```

---

### POST /api/v1/execute/{execution_id}/stop

停止执行

**响应**:

```json
{
  "execution_id": "string",
  "status": "stopped",
  "message": "Execution stopped successfully"
}
```

---

### POST /api/v1/execute/{execution_id}/pause

暂停执行

**响应**:

```json
{
  "execution_id": "string",
  "status": "paused",
  "message": "Execution paused successfully"
}
```

**限制**: 只能暂停状态为 `running` 的执行

---

### POST /api/v1/execute/{execution_id}/resume

恢复执行

**响应**:

```json
{
  "execution_id": "string",
  "status": "running",
  "message": "Execution resumed successfully"
}
```

**限制**: 只能恢复状态为 `paused` 的执行

---

## 健康检查

### GET /health

健康检查端点

**响应**:

```json
{
  "status": "healthy",
  "app": "AI Workflow Service",
  "version": "0.1.0"
}
```

---

### GET /

根路径

**响应**:

```json
{
  "message": "Welcome to AI Workflow Service",
  "version": "0.1.0",
  "docs": "/docs"
}
```

---

## API文档

访问 `/docs` 查看交互式API文档 (Swagger UI)

访问 `/redoc` 查看ReDoc格式的API文档
