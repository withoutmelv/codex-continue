# Codex Continue Desktop

一个基于 Electron + React + TypeScript 的本地桌面应用，用来接管你机器上已经存在的 Codex 会话，并在你离开时继续按固定规则自动托管执行。

它不是新的聊天客户端，也不是远程调度平台。它的定位很明确：

- 读取本机已有的 Codex 会话
- 选择一个会话
- 配置固定提示词、发送次数、单轮超时
- 在同一个原生终端窗口里反复执行 `codex exec resume`
- 在桌面 UI 中查看当前状态、对话记录、托管历史和轮次结果

## 核心功能

- 会话列表
  - 从本机 Codex 状态库读取未归档会话
  - 按最近更新时间排序
  - 支持按项目名搜索

- 自动托管控制
  - 固定指令
  - 发送次数
  - 单轮超时
  - 启动 / 停止托管

- 原生终端复用
  - 每个托管任务绑定一个原生终端窗口
  - 同一个任务的多轮执行会复用同一个终端

- 状态与异常可见
  - 顶部控制区显示当前状态
  - 超时会明确显示为“单轮超时”
  - 其他失败会区分为进程异常或运行时异常

- 历史面板
  - 右下区域支持 `对话记录 | 托管历史` 标签切换
  - 托管历史按任务展示摘要
  - 选中任务后可查看该任务的轮次明细

- 自动清理临时目录
  - 托管任务进入终态后会自动清理临时执行目录
  - 历史信息保留在应用自己的 SQLite 中，不依赖临时文件继续存在

## 当前运行模型

应用当前是一个 Electron 桌面应用，UI 使用 Web 技术渲染。

开发态有两种入口：

- `pnpm dev`
  - 默认启动桌面应用
- `pnpm dev:web`
  - 只启动浏览器前端

也就是说：

- 它不是“纯 Web 项目”
- 也不是 Cocoa / WinUI / Qt 那类原生控件应用
- 它是“Electron 桌面壳 + Web UI”

## 环境要求

建议准备以下环境：

- Node.js 18+
- `pnpm`
- 已安装 `codex` CLI，并且本机已有 Codex 会话数据
- macOS / Linux / Windows 之一

如果你要实际使用自动托管功能，还需要：

- 本机存在 `~/.codex/state_5.sqlite`
- 目标会话有可读取的 rollout 文件
- 当前机器可以正常拉起原生终端

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

如果第一次安装后 Electron 二进制没有正确准备，可以执行：

```bash
pnpm approve-builds --all
pnpm rebuild electron
```

### 2. 启动桌面开发模式

```bash
pnpm dev
```

默认会走桌面入口，相当于：

```bash
pnpm dev:desktop
```

### 3. 只启动 Web 前端

```bash
pnpm dev:web
```

### 4. 构建桌面应用

```bash
pnpm build
```

## 常用脚本

```bash
pnpm dev          # 启动 Electron 桌面开发模式
pnpm dev:desktop  # 显式启动 Electron 桌面开发模式
pnpm dev:web      # 只启动 Vite Web 前端
pnpm build        # 构建桌面应用
pnpm test         # 运行 Vitest 测试
pnpm typecheck    # 运行 TypeScript 类型检查
```

## 自动托管是怎么工作的

高层流程如下：

1. 应用从本机 Codex 数据库读取会话列表
2. 你选择一个已有会话
3. 你填写固定指令、发送次数、单轮超时
4. 应用创建托管任务
5. 为该任务拉起一个原生终端窗口
6. 每一轮执行：

```bash
codex exec resume <session_id> "<fixed_prompt>" --json
```

7. 如果一轮成功结束且未达到目标轮数，就继续下一轮
8. 如果用户停止、单轮超时或进程失败，则结束托管

## 本地数据说明

### 1. Codex 自己的数据

应用会读取本机已有的 Codex 数据：

- `~/.codex/state_5.sqlite`
  - 用于发现会话列表
- 对应会话的 rollout 文件
  - 用于显示对话记录

### 2. 应用自己的持久化数据

应用会在 Electron `userData` 目录下创建自己的 SQLite：

- `app.sqlite`

里面会保留：

- 托管任务摘要
  - 会话 ID
  - 项目路径
  - 固定指令
  - 发送次数
  - 单轮超时
  - 最终状态
  - 最后状态说明
  - 开始 / 更新时间

- 每轮执行摘要
  - 第几轮
  - 退出码
  - 结果类型
  - 最后一条消息
  - 耗时

这些数据会保留下来，用于“托管历史”面板展示。

### 3. 临时执行目录

运行中的托管任务会在系统临时目录下创建：

- `os.tmpdir()/codex-continue/<taskId>`

里面会包含：

- 每轮请求文件
- 每轮结构化结果
- 停止信号文件
- 原始终端输出日志

当前项目已经实现：

- 任务进入 `Completed / Failed / Stopped` 后
- 自动清理该临时目录

所以：

- 长期历史看 `app.sqlite`
- 临时目录只用于运行期协调，不作为长期历史存储

## 项目结构

```text
src/
  app/
    App.tsx
  features/
    sessions/
    tasks/
  lib/
  shared/
  styles/

electron/
  main/
    ipc/
    services/
    terminals/
  preload/
  runner/

tests/
  main/
  renderer/

docs/
  superpowers/
    specs/
    plans/
```

### 关键目录

- `src/app/App.tsx`
  - 主界面入口
- `src/features/sessions/`
  - 会话列表与对话记录
- `src/features/tasks/`
  - 自动托管配置、状态、历史面板
- `electron/main/services/`
  - 会话读取、任务编排、SQLite 持久化、临时目录管理
- `electron/runner/`
  - 托管轮次在终端中的实际执行逻辑
- `tests/`
  - 主进程与渲染层测试

## 测试与质量

当前项目使用：

- Vitest
- React Testing Library
- TypeScript 类型检查

推荐在提交前至少执行：

```bash
pnpm test
pnpm typecheck
```

## 设计方向

当前 UI 遵循仓库里的 [DESIGN.md](/Users/withoutmelv/work/continue-app/DESIGN.md)：

- Azure Clarity
- 浅色、编辑感、无硬边分割
- 分层蓝色调
- Manrope + Inter

## 当前范围与限制

当前项目聚焦在一个很窄但实用的本地工作流：

- 只处理本机已有的 Codex 会话
- 不负责创建新会话
- 不做远程执行
- 不做多用户
- 历史面板展示的是数据库摘要，不展示已清理的临时日志文件

## 相关文档

- [DESIGN.md](/Users/withoutmelv/work/continue-app/DESIGN.md)
- [桌面应用设计文档](/Users/withoutmelv/work/continue-app/docs/superpowers/specs/2026-04-13-codex-continue-desktop-design.md)
- [托管历史与清理设计文档](/Users/withoutmelv/work/continue-app/docs/superpowers/specs/2026-04-13-managed-task-history-and-cleanup-design.md)

