# StockCraft Dev 与 Craft Agents 原版完整实例隔离设计

## 目标

让本仓库启动的开发版与用户已安装的 Craft Agents 原版同时运行，并且在以下方面完全互不影响：

- 配置、工作区、会话、凭据、权限、主题、Skills、Sources 和自动化。
- StockCraft SQLite、消息渠道状态、日志、窗口恢复状态和网络拦截器状态。
- Electron Chromium 数据，包括 Local Storage、Session Storage、缓存和 Cookie。
- 单实例锁、服务锁、Deep Link、开发端口和进程身份。

原版继续使用现有目录和身份，不迁移、不复制、不修改其数据。开发版从新的空实例开始。

## 固定实例身份

| 边界 | Craft Agents 原版 | 本仓库开发版 |
|---|---|---|
| 实例 ID | `production` | `stockcraft-dev` |
| 应用显示名 | `Craft Agents` | `StockCraft Dev` |
| 业务配置根目录 | `~/.craft-agent` | `~/.stockcraft-dev` |
| Electron userData | Electron 原有默认目录 | `%APPDATA%/StockCraft Dev`（其他平台使用对应 appData） |
| Deep Link | `craftagents://` | `stockcraft-dev://` |
| Vite 端口 | 不适用 | `5173`，允许显式覆盖 |
| 内部 RPC 端口 | 运行时分配 | 独立运行时分配 |
| 安装包 appId | `com.lukilabs.craft-agent` | `com.stockcraft.dev` |
| 安装包 productName | `Craft Agents` | `StockCraft Dev` |

`bun run electron:dev` 默认选择 `stockcraft-dev`，不再依赖仓库目录名是否带数字后缀。环境变量仍可显式覆盖，供测试和额外开发实例使用。

## 架构

### 1. 统一实例配置

新增一个无 Electron 依赖的实例配置模块，集中解析：

- `instanceId`
- `appName`
- `configDir`
- `electronUserDataDir`
- `deeplinkScheme`
- `vitePort`

优先级为：

1. 明确环境变量。
2. 开发启动脚本注入的 `stockcraft-dev` 默认值。
3. 生产默认值。

业务代码不得再自行拼接 `homedir()/.craft-agent`。所有业务持久化路径都必须从统一 `CONFIG_DIR` 或实例配置派生。

### 2. Electron 早期引导入口

当前主进程模块在设置应用路径前会执行大量静态 import。为保证 electron-log、Chromium、单实例锁等都使用正确实例，新增一个轻量主进程 bootstrap：

1. 导入 Electron `app`。
2. 读取实例配置。
3. 在任何业务模块加载前调用 `app.setName(appName)`。
4. 在任何 `app.getPath('userData')` 使用前调用 `app.setPath('userData', electronUserDataDir)`。
5. 动态导入现有主进程实现。

开发构建、watch 构建和发行构建统一以 bootstrap 为入口，避免不同构建路径产生不同隔离行为。

Electron 的 `requestSingleInstanceLock()` 在 userData 设置后执行，因此原版和开发版拥有不同的实例锁；同一开发实例内部仍保持单实例行为。

### 3. 业务数据目录

以下生产路径必须改为从统一配置根目录派生：

- 全局配置和偏好。
- 默认工作区目录与 workspace RPC 默认路径。
- 加密凭据 `credentials.enc`。
- 权限、主题、工具图标、文档和 release notes。
- `.server.lock`。
- `stockcraft.sqlite`。
- `window-state.json`。
- 消息渠道目录和 messaging gateway 日志。
- privileged execution audit log。
- unified network interceptor 配置、日志和 API error 文件。
- prerequisite/browser tools 文档路径。
- headless server 的 StockCraft、消息和工作区路径。

注释、测试样例和纯 UI 展示文字可以继续使用 `~/.craft-agent` 作为生产示例；实际运行路径不得硬编码。

### 4. 子进程继承

Electron 启动的 Bun、Node、Pi、Claude、Copilot、MCP 和消息 worker 子进程必须继承：

- `CRAFT_INSTANCE_ID`
- `CRAFT_CONFIG_DIR`
- `CRAFT_APP_NAME`
- `CRAFT_DEEPLINK_SCHEME`

网络拦截器和 CLI 工具必须在子进程内读取 `CRAFT_CONFIG_DIR`，不能回退到原版目录。

### 5. 开发启动和发行包

`scripts/electron-dev.ts` 在未显式提供实例变量时注入：

```text
CRAFT_INSTANCE_ID=stockcraft-dev
CRAFT_CONFIG_DIR=~/.stockcraft-dev
CRAFT_APP_NAME=StockCraft Dev
CRAFT_DEEPLINK_SCHEME=stockcraft-dev
CRAFT_ELECTRON_USER_DATA_DIR=<appData>/StockCraft Dev
CRAFT_VITE_PORT=5173
```

保留数字后缀多实例能力，但它必须在 `stockcraft-dev` 基础上派生，例如第二个开发实例使用 `~/.stockcraft-dev-2`、`StockCraft Dev [2]` 和独立端口。

开发发行包使用独立 electron-builder 配置或配置覆盖，确保 appId、productName、artifactName、安装目录、卸载数据目录和协议注册不会覆盖原版。开发包不接入原版自动更新源。

## 数据策略

- 不自动复制 `~/.craft-agent`。
- 不自动迁移原版凭据或登录状态。
- 开发版首次启动表现为全新安装，需要单独配置模型连接和工作区。
- 用户未来若需要导入，只能通过显式、可审计的导入功能完成；不属于本功能范围。
- 卸载开发发行包只能删除开发版 userData，不能删除 `~/.craft-agent` 或原版 AppData。

## 错误处理

- 实例配置解析失败时，在主进程加载业务模块前输出明确错误并退出。
- `configDir` 与 `electronUserDataDir` 若解析为同一路径或落入原版目录，开发启动应拒绝继续。
- 启动日志必须打印实例 ID、配置根目录、userData 目录、Deep Link 和 Vite 端口，便于确认隔离状态；日志不得输出凭据。
- 若子进程缺失 `CRAFT_CONFIG_DIR`，测试环境应将其视为失败，而不是静默写入原版目录。

## 验证

### 自动验证

- 实例配置默认值和环境变量覆盖测试。
- 开发配置不得解析到 `~/.craft-agent`。
- 所有生产代码的硬编码路径扫描测试。
- Electron bootstrap 顺序测试：先设置 name/userData，再加载主模块。
- Window state、凭据、workspace、StockCraft DB、日志和 interceptor 使用开发目录的 focused tests。
- Electron、shared、server-core、server 和相关子进程 typecheck。
- 主进程构建与 Windows 开发启动入口。

### 双实例端到端验证

同时启动已安装原版和开发版，确认：

1. 两个主进程均存活且各自拥有窗口。
2. 原版仍读写 `~/.craft-agent`。
3. 开发版仅读写 `~/.stockcraft-dev`。
4. 两边拥有不同的 Electron userData、Local Storage 和 Cookie。
5. 两边的 `.server.lock`、StockCraft SQLite 和窗口状态文件不同。
6. 任一应用退出、重启、登录、创建 workspace 或修改偏好，不改变另一应用。
7. 两种 Deep Link 分别只唤醒对应应用。

## 非目标

- 自动迁移或同步原版数据。
- 在原版产品中新增实例切换 UI。
- 让多个实例共享模型凭据。
- 修改原版安装包或已安装文件。
