# 贡献指南

感谢您对AI工作流平台的关注！

## 开发流程

### 1. Fork并克隆仓库

```bash
git clone https://github.com/your-username/ai-workflow-platform.git
cd ai-workflow-platform
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

### 4. 开发和测试

```bash
# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 格式化代码
pnpm format
```

### 5. 提交代码

我们使用Conventional Commits规范：

```bash
git commit -m "feat(scope): add new feature"
```

提交类型：

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链相关
- `perf`: 性能优化
- `ci`: CI/CD相关
- `build`: 构建系统相关

### 6. 推送并创建Pull Request

```bash
git push origin feature/your-feature-name
```

然后在GitHub上创建Pull Request。

## 代码规范

### TypeScript/JavaScript

- 使用ESLint和Prettier进行代码格式化
- 遵循Vue 3 Composition API最佳实践
- 使用TypeScript严格模式
- 避免使用`any`类型，尽量使用具体类型

### Python

- 使用Black进行代码格式化
- 使用Ruff进行代码检查
- 遵循PEP 8规范
- 使用类型注解

### Vue组件

- 使用Composition API
- 组件名使用PascalCase
- Props使用camelCase
- 事件名使用kebab-case

### 命名规范

- 文件名：kebab-case（如：`user-profile.vue`）
- 组件名：PascalCase（如：`UserProfile`）
- 函数名：camelCase（如：`getUserData`）
- 常量：UPPER_SNAKE_CASE（如：`MAX_RETRY_COUNT`）

## 测试

- 为新功能编写单元测试
- 确保所有测试通过
- 保持测试覆盖率在80%以上

## 文档

- 更新相关文档
- 为公共API添加JSDoc注释
- 更新README.md（如有必要）

## 问题反馈

如果您发现bug或有功能建议，请创建Issue并提供：

1. 问题描述
2. 复现步骤
3. 期望行为
4. 实际行为
5. 环境信息（操作系统、Node版本等）

## 行为准则

- 尊重他人
- 保持专业
- 接受建设性批评
- 关注项目目标

感谢您的贡献！🎉
