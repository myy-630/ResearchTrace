# ResearchTrace 完整产品规格说明书

> 文档用途：本文件是 ResearchTrace 项目的唯一产品与技术规格来源（Single Source of Truth）。Codex 在开始任何里程碑前必须完整阅读本文件。未经人工确认，不得擅自缩减、扩展或改变产品核心行为。
>
> 开发原则：本项目只有一个完整产品。M1–M9 只是同一产品的施工里程碑，不是 v1/v2/v3 产品版本。

---

## 1. 产品概述

### 1.1 产品名称

**ResearchTrace**

中文定位：**面向科研过程的本地研究演化、实验溯源与论文一致性审计插件。**

### 1.2 产品形态

ResearchTrace 是一个安装在 **DeepSeek Harness** 中的本地插件。

它不是独立网站，不开发独立 SaaS 后台，不要求云端账号，不依赖 W&B、MLflow、DVC 或其他外部实验平台。

所有 ResearchTrace 自己维护的数据默认保存在当前科研项目本地目录中；UI 全部嵌入 Harness 的右侧 Sidebar。

### 1.3 核心问题

真实科研项目往往同时存在以下问题：

1. 实验越来越多，几周后很难记住每个实验属于哪条研究路线、为什么做、为什么放弃。
2. 失败实验虽然不再需要参与当前搜索，但又不能直接删除，因为它们仍然是研究历史和决策证据。
3. 论文中的某个数字、表格、结论，很难快速追溯到对应实验、配置、代码状态和数据划分。
4. 论文写作阶段容易发生结果抄错、超参数描述错误、数据划分不一致、均值标准差计算错误等问题。
5. 普通实验管理工具更关注 run、metric、artifact；它们不直接表达“研究思路为什么从 A 演化到 B”“为什么某条方法被否决”。

ResearchTrace 要解决的不是通用 MLOps，而是：

> **把“研究问题 → 方法演化 → 实验 → 结果 → 科研决策 → 论文结论”连成一条本地、可追溯、可审计的证据链。**

---

## 2. 产品目标与非目标

### 2.1 产品目标

ResearchTrace 必须做到：

1. 在用户通过 Harness 发起实验时，自动创建并维护该实验的生命周期记录。
2. 将研究过程组织成“研究演化树”，表达方法如何产生、分支、继续、暂停、否决和归档。
3. 当用户否决或归档某个方法时，保留全部历史证据，但默认检索不再进入该路线。
4. 支持 Markdown、LaTeX、Word 论文文档。
5. 从论文中抽取结构化科研结论，并将其匹配到真实实验。
6. 从论文结论反向追溯到实验、配置、Git 状态、数据划分和相关产物。
7. 对论文与实验之间的一致性执行确定性审计，并在 Harness Sidebar 中展示报告。
8. 所有核心数据在关闭并重新打开 Harness 后仍然存在。
9. 对失败实验同样记录，不只记录成功实验。
10. 所有关键行为都必须有自动测试和可复现的人工验收场景。

### 2.2 明确不做

以下内容不属于本项目：

- 不接入 W&B、MLflow、DVC、ClearML 等外部平台。
- 不实现 W&B/MLflow 的完整替代品。
- 不做云端同步、账号系统、多人协作和权限系统。
- 不做独立 Web 管理后台。
- 不自动监听所有终端命令并猜测哪些命令是训练实验。
- 不要求用户使用固定口令，例如“开始记录实验”。
- 不把项目中的大数据集或模型文件复制进 ResearchTrace 数据库。
- 不默认移动、删除或重命名用户科研文件。
- 不把“归档”实现为物理移动文件。
- 不负责实时 GPU 监控、训练曲线平台、超参数搜索、模型注册中心。
- 不做“科学结论是否正确”的开放式同行评审判断。
- PDF 不作为主要论文输入格式；核心支持是 Markdown、LaTeX 和 Word。
- 不把大模型当成数值计算器或事实数据库使用。

---

## 3. 借鉴的成熟产品思想

本项目可以借鉴成熟产品已经验证过的设计逻辑，但不依赖它们：

- **W&B / MLflow**：一次实验对应一个 run；run 具有参数、指标、时间、标签、产物等结构化信息。
- **DVC**：实验和版本之间存在父子/分支关系。
- **ClearML**：活跃、归档、恢复以及默认隐藏历史内容的交互逻辑。
- **Code Ocean**：从一个结果反向查看其代码、运行和数据来源的溯源思想。

ResearchTrace 在这些成熟逻辑之上增加两个核心语义层：

1. **研究方法与科研决策层**：方法为什么产生、为什么继续、为什么否决。
2. **论文证据层**：论文 Claim / Table / Figure 如何追溯到实验事实。

---

## 4. 整体用户工作流

### 4.1 初始化科研项目

当用户第一次在某个 Harness workspace 中使用 ResearchTrace 时：

1. 插件判断当前项目是否已初始化。
2. 若未初始化，用户可通过自然语言，例如“初始化这个科研项目”“开始用 ResearchTrace 管这个项目”。
3. 插件创建本地 `.researchtrace/` 目录和 SQLite 数据库。
4. 插件扫描 Git 状态、常见配置目录、实验结果目录和论文目录，但不修改用户现有文件。
5. 侧边栏显示研究演化树的空状态或扫描结果。

初始化后，ResearchTrace 只管理该 workspace 对应的本地科研项目。

### 4.2 用户发起实验

用户不需要说固定口令。

以下自然语言都属于明确实验意图：

- “跑一下 Future30。”
- “试一下 EMA=0.999。”
- “开始这个训练。”
- “用 patient-level split 再跑三次 seed。”
- “做一下 Joint Training 这个实验。”

当 Agent 判断用户明确要求通过 Harness 启动一个科研实验时，必须先进入 ResearchTrace 实验生命周期，而不是直接把它当普通 shell 命令执行。

标准流程：

1. 解析用户意图，确定所属研究方法和实验组。
2. 如目标节点不存在且语义明确，可自动创建合适节点；若存在真正不可消解的歧义，才向用户询问一次。
3. 在训练命令真正执行前创建 run 记录。
4. 记录当前 Git 状态、配置、命令、数据划分信息等。
5. 通过 Harness 支持的安全 shell/执行能力启动训练。
6. 训练成功、失败或被取消后，都必须结束该 run，并记录最终状态。
7. 收集结构化指标和用户配置的实验产物。
8. 更新侧边栏节点详情。

重要规则：

- 不通过后台监听 terminal 自动识别训练。
- 如果用户只是执行普通程序而没有实验语义，不创建 run。
- 如果用户明确说“只跑一下，不要记录”，应尊重用户要求。
- ResearchTrace 优先通过专用实验执行工具封装实验生命周期，避免模型忘记收尾。

### 4.3 方法被判断无效

用户可能说：

- “Joint Training 这条方法不行，归档吧。”
- “这个方向效果一直不行，不考虑了。”
- “先暂停 Multi-horizon。”

ResearchTrace 应：

1. 修改对应方法节点的状态。
2. 记录用户原始决策文本。
3. 生成简洁决策摘要。
4. 关联支持该决策的关键实验。
5. 如为 rejected / archived，则该方法及其后代默认从普通检索候选集中排除。
6. 不移动或删除原始实验文件。
7. 用户明确提到该历史方法、归档内容、失败实验时，允许重新检索。

### 4.4 写论文与溯源

用户可以告诉 ResearchTrace：

- “解析这篇论文。”
- “这个 0.5614 是哪次实验来的？”
- “Table 2 的 Ours 对应哪个 run？”
- “检查这一节实验设置。”

系统从 `.md`、`.tex`、`.docx` 中抽取结构化 Claim，并尝试与本地实验建立证据关系。

### 4.5 审计

用户可以说：

- “审计这篇论文。”
- “做提交前检查。”
- “检查 Table 2。”

系统生成审计会话，检查数字、参数、数据划分、统计量、证据完整性、可比性和归档证据误用等问题，并在 Harness Sidebar 中展示审计报告。

---

## 5. 研究演化树

### 5.1 树的定位

研究演化树不是文件树，也不是 Git 树。

它表达：

> **研究思路如何产生、分叉、试验、失败、暂停、继续，并最终形成论文结论。**

### 5.2 节点类型

研究演化树包含四种核心节点：

1. `research_question`：研究问题
2. `method`：方法 / 研究路线
3. `experiment_group`：实验组 / 变量探索
4. `run`：单次实验

约束：

- 研究问题通常是根节点。
- 方法可以挂在研究问题下，也允许方法挂在方法下，用于表达方法演化。
- 实验组必须挂在方法下。
- 单次实验必须挂在实验组下。

示例：

```text
未来 AF 预测
├── Recon-only
│   └── Baseline seeds
│       ├── run_001
│       └── run_002
├── Future Prediction
│   ├── Future5
│   │   └── EMA Study
│   │       ├── run_010
│   │       └── run_011
│   └── Future30  ★主路线
│       ├── Epoch Study
│       └── Patient CV
├── Joint Training  ✕已否决
└── Multi-horizon   ⏸暂停
```

### 5.3 节点状态

树节点支持：

- `active`：当前正常研究
- `paused`：暂时停止
- `completed`：已完成但仍是有效历史
- `rejected`：明确验证不值得继续
- `archived`：历史内容，默认冷存储

另外使用独立字段：

- `is_primary = true/false`：表示当前主路线，不把“主路线”混进生命周期状态。

### 5.4 默认检索规则

默认检索：

- 包含 active / completed。
- paused 可以被检索，但排序降低。
- rejected / archived 默认排除。

如果某个节点的祖先是 rejected / archived，则该节点也被视为“默认不可检索”，即使自身 run 状态仍为 succeeded。

只有当用户：

- 明确提到某个已归档/否决方法名称；
- 明确要求查看“历史、失败、归档”的内容；
- 显式启用 `include_archived`；

系统才检索这些节点。

### 5.5 归档语义

归档是**逻辑归档**。

禁止默认执行：

- `mv` 用户实验目录
- 删除 checkpoint
- 改变论文路径
- 重写训练输出目录

归档只改变 ResearchTrace 数据库中的状态和默认检索策略。

恢复归档只恢复 ResearchTrace 状态，不操作用户原文件。

---

## 6. 实验生命周期与“实验身份证”

### 6.1 Run 执行状态

单次实验运行状态：

- `created`
- `running`
- `succeeded`
- `failed`
- `cancelled`

失败实验必须保存。

### 6.2 启动前记录

真正执行命令前至少记录：

- run id
- 所属研究树节点
- 用户实验意图原文
- 训练命令
- 工作目录
- 开始时间
- Git commit hash
- Git branch
- Git dirty 状态
- 当前 tracked diff 的快照或哈希
- 未跟踪文件清单（至少路径；合理时记录哈希）
- 配置文件路径与内容哈希
- 可解析的配置字段
- 数据集名称（若已知）
- 数据划分文件路径和哈希（若已知）
- seed（若可获取）

### 6.3 结束后记录

实验结束后至少记录：

- 结束时间
- exit code
- succeeded / failed / cancelled
- metrics
- best epoch（若存在）
- checkpoint 路径（若存在）
- prediction 文件路径（若存在）
- 图片、表格、日志等关联产物
- 产物文件哈希（合理范围内）

### 6.4 配置来源优先级

配置可来自：

1. 用户明确指定的配置文件。
2. 训练命令中的 `--config` 等明显参数。
3. `.researchtrace/project.yaml` 中定义的项目规则。
4. 用户在自然语言中明确说明的关键参数。

支持的结构化配置至少包括：

- YAML
- JSON
- TOML（如实现代价合理）
- 命令行参数

### 6.5 指标来源

优先读取结构化结果：

- JSON
- CSV

可以通过项目配置声明指标文件 glob 或固定路径。

不要依赖大模型从几万行训练日志里猜最终指标作为唯一真相。

### 6.6 数据版本

ResearchTrace 不复制原始大数据。

数据版本以元数据表达：

- dataset name
- dataset path（可选）
- split path
- split file hash
- preprocessing config hash
- 用户定义 version/tag

---

## 7. 科研资产

### 7.1 Asset 概念

参考成熟实验平台的 artifact 思想：配置、指标、checkpoint、预测结果、图表、日志、数据划分都视为可追溯资产，而不是只有“附件文件”。

Asset 类型至少包括：

- `config`
- `metrics`
- `checkpoint`
- `prediction`
- `figure`
- `table`
- `log`
- `dataset_split`
- `other`

每个资产记录：

- id
- run id
- type
- path
- hash（适用时）
- size
- created_at
- metadata JSON

ResearchTrace 默认只记录引用和元数据，不复制大文件。

---

## 8. 科研决策记忆

### 8.1 决策对象

Decision 可以挂在：

- 方法
- 实验组
- 单次实验

### 8.2 决策字段

至少保存：

- 原始用户表达
- 结构化决策类型
- 决策摘要
- 原因
- 关联关键实验
- 替代路线（如有）
- 重新开启条件（如有）
- 创建时间

决策类型至少包括：

- continue
- pause
- reject
- archive
- promote_to_primary
- reopen

### 8.3 归档摘要

当方法被 rejected / archived 时，LLM 可生成：

- 尝试了什么
- 核心证据
- 为什么停止
- 仍然值得保留的观察
- 什么情况下值得重新开启

LLM 只负责总结，实验数字必须来自结构化数据库。

---

## 9. 论文文档支持

### 9.1 支持格式

必须支持：

- `.md`
- `.tex`
- `.docx`

PDF 不是核心支持格式。

### 9.2 文档记录

每份论文文档记录：

- document id
- path
- type
- content hash
- last parsed time
- Git commit（若项目受 Git 管理）

文档内容变化后应能识别 hash 改变并重新解析相关 Claim。

### 9.3 位置定位

解析必须尽量保留可回到原文的位置：

- Markdown：标题 / 段落 / 行号或稳定文本锚点
- LaTeX：section / environment / 行号
- Word：标题层级 / 段落序号 / 表格坐标

---

## 10. 论文 Claim 模型

### 10.1 Claim 类型

第一类：**结果比较 Claim**

例如：

> Future30 将 AUPRC 从 0.5490 提高到 0.5614。

结构化字段包括：

- task
- metric
- baseline method
- baseline value
- target method
- target value
- delta（若文中给出）
- horizon / dataset / split / subgroup（若存在）

第二类：**实验设置 Claim**

例如：

> 历史窗口为 20 秒，未来窗口为 30 秒，学习率为 1e-4。

字段：参数名、参数值、作用范围。

第三类：**数据 Claim**

例如：

> 数据按患者划分训练集和测试集。

字段：数据集、版本、split strategy、预处理描述。

第四类：**统计 Claim**

例如：

> 报告 5 个 seed 的平均值和标准差。

字段：重复次数、聚合方式、mean、std、置信区间（若有）。

### 10.2 Claim 通用字段

- id
- document_id
- claim_type
- original_text
- normalized JSON
- source location
- parse model / parse version
- status

Claim 状态：

- `unmatched`
- `matched`
- `ambiguous`
- `conflict`
- `insufficient_evidence`

---

## 11. Claim → 实验匹配

### 11.1 原则

匹配必须“可解释”，不能让大模型直接凭感觉选一个 run。

### 11.2 候选集

默认候选：

- 排除 rejected / archived 方法及其后代。
- 若用户明确要求历史/归档或明确点名归档方法，则允许纳入。

### 11.3 分层匹配流程

第一层：确定性硬过滤

- metric 名称
- task / horizon
- method tag
- dataset / split
- seed（若 Claim 指定）

第二层：数值匹配

- exact match
- rounding-consistent match
- configurable tolerance

第三层：配置相似度

例如比较：

- history / future window
- EMA
- learning rate
- model variant
- split
- method tags

第四层：LLM 语义匹配

仅用于：

- 方法描述与本地命名不同
- run 名称语义化
- 论文使用自然语言、实验使用缩写

### 11.4 输出

每个候选应输出可解释理由，例如：

- horizon 一致
- metric 一致
- 0.5614 与实验值精确一致
- patient split 一致
- 方法描述语义一致

### 11.5 禁止静默猜测

如果多个候选无法可靠区分：

- Claim 状态必须为 `ambiguous`
- 不得自动挑一个并标记 confirmed
- UI 展示候选和差异

一旦用户确认，可持久化该匹配关系。

---

## 12. 论文证据链

一个已匹配 Claim 必须可以展示：

```text
论文 Claim
  ↓
Table / Figure / Paragraph
  ↓
实验结果 / Metric
  ↓
Run
  ↓
Config
  ↓
Git 状态
  ↓
Dataset / Split
```

用户点击任何一个环节应能在侧边栏节点详情中看到对应路径、哈希、参数或原始位置。

ResearchTrace 不要求创建复杂图数据库；SQLite 关系即可。

---

## 13. 一致性审计

### 13.1 审计严重程度

- `error`：明确冲突，可能影响论文正确性
- `warning`：证据不足、缺失或存在复现风险
- `info`：提示性信息

### 13.2 必须实现的审计规则

#### A. 数值结果一致性

检查论文数字是否与对应 run 的结构化 metric 一致，支持合理的小数位舍入。

#### B. 超参数一致性

检查论文描述的关键超参数是否与实际配置一致。

#### C. 数据与划分一致性

检查 dataset、split strategy、split file hash、预处理配置等是否一致。

#### D. 统计量重算

若论文报告 mean ± std 且能找到对应多 seed runs，则重新计算并比较。

#### E. 证据链完整性

论文关键结果是否能追溯到：

- run
- config
- Git 状态
- dataset/split 信息

#### F. 可比性检查

如果一条论文 Claim 比较两个方法，应检查其核心实验协议是否可比，例如：

- dataset/split
- horizon
- evaluation task
- metric definition

#### G. 归档/否决证据误用

如果论文当前主结论引用了已经 rejected / archived 且未显式重新启用的方法或实验，给出 warning/error。

#### H. 脏工作区复现风险

若关键结果来自 dirty Git 工作区且未保存差异快照，给出 warning。

### 13.3 Finding 输出结构

每条 finding 至少包括：

- severity
- rule id
- 问题说明
- 论文侧证据
- 实验侧证据
- 相关 Claim / Run / Node
- 建议动作

示例：

```text
ERROR — PARAMETER_MISMATCH
论文写：EMA = 0.99
实际 run_041：EMA = 0.999
建议：确认论文是否写错，或重新绑定正确实验。
```

### 13.4 审计报告

每次审计形成一个 audit session：

- document hash
- 审计时间
- 规则版本
- error / warning / info 数量
- findings

报告既存数据库，也可导出本地 Markdown / JSON 到 `.researchtrace/reports/`。

---

## 14. Harness 交互设计

### 14.1 总原则

ResearchTrace 的所有 UI 均位于 DeepSeek Harness 的右侧 Sidebar。

禁止新增独立完整页面或外部 Web 后台。

### 14.2 Sidebar 三种核心视图

#### 视图 1：研究演化树

显示：

- 节点层级
- 状态图标
- 主路线标记
- 展开/折叠
- 当前运行状态
- error/warning badge（若相关）

用户点击节点进入“节点详情”。

#### 视图 2：节点详情

根据节点类型展示：

方法：

- 动机
- 状态
- 父方法
- 决策摘要
- 关键实验
- 下一步

实验组：

- 变量
- runs
- 比较结果

Run：

- 命令
- Git
- config
- metrics
- dataset/split
- assets
- 执行状态

#### 视图 3：审计报告

显示：

- 总体 error/warning/info 计数
- 规则分类
- finding 列表
- Claim → Run 证据链
- 点击 finding 跳转相关节点详情

### 14.3 UI 约束

- Sidebar 空间有限，优先层级清晰、信息密度高。
- 不做全屏大型拓扑图作为主交互。
- 树默认只展示方法结构，run 可以按需展开，避免 300 个 run 撑爆侧栏。
- 所有关键操作都可以由聊天自然语言触发；Sidebar 主要负责“看”和少量点击导航。
- 可以提供简单按钮，例如归档、恢复、设为主路线、打开审计项，但按钮不是主要入口。

### 14.4 Harness 当前集成方向

Codex 实现时应基于当前 DeepSeek Harness 官方接口验证：

- 插件以 bundle/profile 机制安装到隔离 profile。
- Host 侧提供 ResearchTrace 服务和模型工具。
- Browser/Client 侧注册右侧 Sidebar 自定义 tab 类型和 body。
- Host 与 Client 之间使用 Harness 当前官方 Remote/BFF 机制，不另起本地 HTTP 服务。
- Harness API 变化较快，具体包名、注入名、slot 名以开发当日官方仓库为准；若与本规格中的概念性命名不同，应保持产品行为不变，并在里程碑报告中说明适配。

---

## 15. Agent 工具设计

工具名可以在实现时按 Harness 规范调整，但语义必须保持。

至少需要以下能力：

### 15.1 项目

- `researchtrace_init_project`
- `researchtrace_get_project_state`

### 15.2 研究树

- `researchtrace_create_node`
- `researchtrace_update_node`
- `researchtrace_set_status`
- `researchtrace_set_primary`
- `researchtrace_get_tree`
- `researchtrace_get_node_detail`

### 15.3 实验

优先实现一个封装完整生命周期的：

- `researchtrace_run_experiment`

其内部负责：

1. 创建 run
2. 快照元数据
3. 调用 Harness 支持的安全执行能力
4. 结束 run
5. 收集结果

同时可以存在底层：

- `researchtrace_start_run`
- `researchtrace_finish_run`

供测试和特殊流程使用。

### 15.4 检索与决策

- `researchtrace_search`
- `researchtrace_record_decision`
- `researchtrace_archive_node`
- `researchtrace_restore_node`

### 15.5 论文

- `researchtrace_parse_document`
- `researchtrace_list_claims`
- `researchtrace_trace_claim`

### 15.6 审计

- `researchtrace_run_audit`
- `researchtrace_get_audit_report`

工具描述必须明确默认 archive filtering 行为，避免 Agent 将历史失败路线重新注入当前上下文。

---

## 16. LLM 与确定性程序的职责边界

### 16.1 LLM 负责

- 从论文文本抽取 Claim
- 自然语言科研意图分类
- 方法描述语义匹配
- 候选实验语义排序（只能作为后层）
- 决策摘要
- 归档摘要
- 审计结果的人类可读解释

### 16.2 程序负责

- 文件扫描
- Git 信息
- SQLite
- YAML/JSON/TOML 解析
- CSV/JSON metrics
- 文件 hash
- 数值比较
- mean/std
- 状态过滤
- archive visibility
- 关系存储
- 审计规则执行
- 路径定位

### 16.3 原则

> **LLM 负责理解语义，程序负责判断事实。**

任何可以确定性计算的事实都不得只依赖 LLM 回答。

---

## 17. 本地数据与目录结构

建议项目根目录：

```text
my-research-project/
├── src/
├── configs/
├── experiments/
├── results/
├── paper/
├── .git/
└── .researchtrace/
    ├── researchtrace.db
    ├── project.yaml
    ├── snapshots/
    │   └── <run-id>/
    │       ├── git.patch
    │       └── manifest.json
    ├── reports/
    │   ├── audit-<timestamp>.json
    │   └── audit-<timestamp>.md
    └── cache/
```

`.researchtrace/` 可以加入 `.gitignore`，也允许用户选择将部分元数据纳入 Git；默认不要替用户自动修改 `.gitignore`，除非用户确认。

---

## 18. SQLite 数据模型

数据库必须有 schema version 和 migration 机制。

### 18.1 projects

- id
- root_path
- name
- created_at
- updated_at
- schema_version

### 18.2 worktree_nodes

- id
- project_id
- type (`research_question|method|experiment_group|run`)
- parent_id
- name
- status
- is_primary
- motivation
- summary
- tags_json
- created_at
- updated_at
- archived_at

### 18.3 run_details

与 type=run 的节点一对一：

- node_id
- execution_status
- user_intent
- command
- cwd
- started_at
- ended_at
- exit_code
- git_commit
- git_branch
- git_dirty
- git_diff_hash
- config_json
- metrics_json
- dataset_json
- seed

### 18.4 assets

- id
- run_node_id
- type
- path
- content_hash
- size
- metadata_json
- created_at

### 18.5 decisions

- id
- node_id
- decision_type
- raw_user_text
- summary
- reason
- reopen_condition
- related_run_ids_json
- created_at

### 18.6 documents

- id
- path
- type
- content_hash
- git_commit
- parsed_at

### 18.7 claims

- id
- document_id
- claim_type
- original_text
- normalized_json
- source_location_json
- status
- created_at
- updated_at

### 18.8 claim_run_links

- id
- claim_id
- run_node_id
- status (`confirmed|candidate|rejected`)
- confidence
- reasons_json
- created_at

### 18.9 audit_sessions

- id
- document_id
- document_hash
- rules_version
- created_at
- error_count
- warning_count
- info_count

### 18.10 audit_findings

- id
- audit_session_id
- rule_id
- severity
- message
- claim_id
- run_node_id
- paper_evidence_json
- experiment_evidence_json
- recommendation

---

## 19. ResearchTrace 插件代码结构

建议：

```text
ResearchTrace/
├── package.json
├── cordis.patch.yml
├── tsconfig.json
├── docs/
│   └── RESEARCHTRACE_SPEC.md
├── src/
│   ├── shared/
│   │   ├── types.ts
│   │   └── schemas.ts
│   ├── host/
│   │   ├── index.ts
│   │   ├── db/
│   │   ├── git/
│   │   ├── experiment/
│   │   ├── worktree/
│   │   ├── search/
│   │   ├── paper/
│   │   ├── trace/
│   │   ├── audit/
│   │   ├── tools/
│   │   └── remote/
│   └── client/
│       ├── index.tsx
│       ├── sidebar/
│       │   ├── ResearchTree.tsx
│       │   ├── NodeDetail.tsx
│       │   └── AuditReport.tsx
│       └── state/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── fixtures/
    └── demo-research-project/
```

最终目录可根据 Harness 官方包约定调整，但模块边界不可被破坏。

---

## 20. 技术约束

### 20.1 语言

优先 TypeScript，因为 Harness 插件和 Browser Client 均处于 Node/TS/React 生态。

### 20.2 数据库

使用 SQLite。

具体 SQLite 库由 Codex 根据当前 Harness Node 运行时兼容性选择，优先减少原生编译安装摩擦。

### 20.3 UI

React，并复用 Harness 当前官方 UI / slot / sidebar 机制。

不要引入第二套独立前端框架。

### 20.4 LLM

必须复用 Harness 当前模型/Agent 能力，不要求用户为 ResearchTrace 再配置一个独立第三方 LLM API key。

### 20.5 Shell

实验执行应复用 Harness 当前官方 shell/permission 能力；不要为了方便直接绕开宿主权限策略执行任意 `child_process`，除非官方机制确实无法满足且人工确认。

---

## 21. 搜索策略

### 21.1 默认搜索

搜索对象：

- node name
- tags
- motivation
- summary
- decisions
- run metadata

可以使用 SQLite FTS 或等价本地方案。

### 21.2 Archive Filter

所有搜索服务必须有显式参数：

- `include_rejected=false`
- `include_archived=false`

默认 false。

Agent 根据用户明确意图设置 true。

### 21.3 精确点名优先

用户明确点名某个归档方法时，不应该回答“找不到”；应允许精确名称命中历史节点。

---

## 22. 异常与边界情况

必须处理：

1. 训练命令执行失败：run 标记 failed，仍保存日志和已有元数据。
2. Harness 被用户中途关闭：下次启动识别 lingering running 状态并标记 interrupted 或提示恢复。
3. Git 不存在：插件仍可工作，但显示“无 Git 证据”。
4. Git dirty：记录状态并尽量保存 diff snapshot。
5. 找不到 metrics：实验仍存在，但标记“结果未收集”。
6. 文档 Claim 找到多个 run：ambiguous，不自动确认。
7. 文档数字与 run 冲突：conflict + audit finding。
8. 用户归档父方法：后代默认检索全部屏蔽，但原状态不被覆盖。
9. 用户恢复父方法：只恢复父节点本身；子节点自身独立 archived 状态保持。
10. 文件被移动：通过 path + hash 尝试重新定位；找不到时标记 missing，不静默伪造。
11. 大文件：只记录元数据和 hash 策略，不读入 LLM context。
12. `.docx` 中复杂图表无法可靠抽取：应提示范围限制，不虚构内容。

---

## 23. 安全与隐私

- ResearchTrace 自身不上传科研文件到自建云服务。
- 所有数据库和报告默认本地。
- 不记录密钥、token、密码。
- 解析配置前对常见 secret 字段进行屏蔽。
- 任何删除/移动用户文件的功能均不属于核心产品。
- 插件运行在 Harness Host 中，依赖必须最小化并锁定版本。

---

## 24. 测试夹具

项目必须提供一个完全本地、可重复运行的模拟科研项目，用于自动测试和面试演示。

建议包含：

- 1 个研究问题
- 4 条方法路线
- 6–8 个实验组
- 20–30 个 runs
- 其中一条方法 rejected / archived
- 至少 3 个 failed runs
- 多 seed 结果
- Markdown / LaTeX / Word 各一份简短论文样例或测试文档

故意制造：

- 一个论文指标写错
- 一个 learning rate 写错
- 一个 split 描述错误
- 一个 mean/std 错误
- 一个 Claim 有两个几乎相同的候选 run
- 一个主结论错误引用 archived 路线
- 一个 dirty Git run

测试项目的训练脚本应轻量，例如几秒内完成并生成固定结构化 metrics，不依赖 GPU。

---

## 25. 质量与成功标准

### 25.1 必须满足

- ResearchTrace 可以作为本地 Harness 插件真实安装。
- 无外部云服务也可完成完整演示。
- Harness 重启后数据持久存在。
- archived / rejected 方法不污染默认检索。
- 失败实验不会丢失。
- exact / rounding 型论文结果匹配在固定测试集上应达到 100% 预期行为。
- 明确歧义的 Claim 必须标记 ambiguous，不允许假确认。
- 所有确定性审计规则在固定 fixture 上与预期答案一致。
- Markdown / LaTeX / Word 均至少通过一条完整解析→Claim→溯源链。

### 25.2 语义匹配评估

准备一组只能依赖自然语言方法名匹配的 Claim 测试集。

记录：

- confirmed correct
- ambiguous correctly detected
- wrong auto-confirm

关键指标不是强行追求 100% top-1，而是：

> **错误自动确认必须尽量为 0；不确定时宁可 ambiguous。**

---

# 26. 开发里程碑

再次强调：以下 M1–M9 是同一个完整产品的施工顺序，不是产品版本。

每个里程碑完成后 Codex 必须停止，等待人工验收，不能自动进入下一阶段。

---

## M1：插件骨架、本地持久化与 Harness Sidebar 占位

### 目标

建立不会阻塞后续模块的完整工程骨架。

### 必须完成

- Harness bundle/package 结构
- researchtrace-dev 隔离 profile 安装方式
- Host 插件正常加载
- Client 插件正常加载
- ResearchTrace 右侧 Sidebar tab 可以打开
- `.researchtrace/` 初始化
- SQLite schema / migrations
- 基础 project service
- 基础 remote 通道
- 测试框架

### 人工验收

1. 在一个新科研 fixture workspace 中启动 Harness。
2. 安装 ResearchTrace 到测试 profile。
3. 打开 ResearchTrace Sidebar。
4. 初始化项目。
5. 检查 `.researchtrace/researchtrace.db` 存在。
6. 关闭并重新启动 Harness。
7. 项目状态仍存在。

### 自动验收

- bundle manifest test
- db migration test
- project init test
- persistence test
- Host/Client basic integration test

### 失败条件

- 只能独立运行，不能装入 Harness。
- UI 是独立网页而不是 Sidebar。
- 数据只存在内存。

---

## M2：实验生命周期

### 目标

用户通过 Harness 发起一个实验时，ResearchTrace 从运行前到运行后完整记录。

### 必须完成

- 实验意图对应 tool 设计
- run 创建
- Git capture
- config capture
- 安全执行训练
- run finalize
- failed/cancelled 记录
- metrics 收集
- assets 收集
- run detail API

### 人工验收

用户说：

> “跑一下 Future30，使用 fixtures/configs/future30.yaml。”

预期：

- 命令运行前已有 run id
- Sidebar 能看到 running
- 结束后显示 succeeded
- config / Git / metrics / assets 可见
- 故意运行失败命令后出现 failed run，而不是消失
- 重启后仍存在

### 自动验收

- successful run lifecycle
- failed run lifecycle
- cancelled/interrupted recovery
- Git clean/dirty capture
- config parser
- metrics parser
- asset hashing

---

## M3：研究演化树与状态管理

### 目标

形成完整研究问题→方法→实验组→run 树，并在 Sidebar 中可视化。

### 必须完成

- worktree nodes CRUD
- method → method evolution
- primary marker
- status
- Sidebar ResearchTree
- NodeDetail 基础版
- archive effective visibility
- restore

### 人工验收

构造：

```text
Research Question
├── Recon-only
├── Future Prediction
│   └── Future30
└── Joint Training
```

将 Joint Training 归档后：

- 树显示归档状态
- 其 runs 仍存在
- 默认查询不返回
- 明确查询“Joint Training 历史实验”可以返回
- 恢复后重新进入默认搜索

### 自动验收

- tree parent constraints
- recursive descendant visibility
- archive filter
- restore
- primary uniqueness rule（按定义范围）

---

## M4：科研决策记忆与检索

### 目标

让系统不仅知道做过什么，还知道为什么继续/停止。

### 必须完成

- decisions
- reject/archive natural-language flow
- decision summary
- key runs linkage
- reopen condition
- local search
- archive-aware retrieval

### 人工验收

用户说：

> “Joint Training 一直低于 Recon-only，这条方法不做了，归档；以后除非我明确找它，不要拿它回答当前最优方法。”

然后：

1. 问“目前最好的路线有哪些？” → 不出现 Joint Training。
2. 问“当时为什么放弃 Joint Training？” → 返回决策和关键 runs。
3. 问“把 Joint Training 的历史实验找出来。” → 能返回。

### 自动验收

- decision persistence
- default search exclusion
- explicit archived lookup
- exact-name archived lookup
- summary source grounding test

---

## M5：论文解析与 Claim 抽取

### 目标

支持 `.md` / `.tex` / `.docx`，抽取四类结构化 Claim。

### 必须完成

- document registry + hash
- three parsers
- location mapping
- LLM claim extraction
- claim persistence
- cache/reparse on content change

### 人工验收

分别导入 Markdown、LaTeX、Word 测试文档。

预期：

- 都能显示文档
- 都能抽取结果、设置、数据、统计 Claim
- Claim 可定位回原文位置
- 修改原文后重新解析产生更新

### 自动验收

- format parser tests
- source-location tests
- document hash invalidation
- structured claim schema validation

---

## M6：Claim → 实验溯源

### 目标

建立“论文结论 → run → config/Git/data”的证据链。

### 必须完成

- deterministic candidate filter
- numeric matching
- rounding tolerance
- config similarity
- semantic fallback
- ambiguous handling
- user confirmation persistence
- evidence chain UI

### 人工验收

对 Claim：

> “Future30 AUPRC = 0.5614”

预期：

- 找到正确 run
- 显示匹配原因
- 展示 config / Git / split

对故意准备的双候选 Claim：

- 必须显示 ambiguous
- 不得擅自确定其中一个

### 自动验收

- exact numeric match
- rounded numeric match
- archived candidate exclusion
- config scoring
- ambiguous candidate test
- persisted confirmation test

---

## M7：论文一致性审计

### 目标

实现完整确定性审计引擎。

### 必须完成

A–H 审计规则：

- result
- parameter
- data/split
- mean/std
- trace completeness
- comparability
- archived evidence
- dirty Git risk

并完成 AuditReport Sidebar。

### 人工验收

用 fixture 中故意错误的论文运行审计。

预期至少发现：

- 一个数字错误
- 一个学习率错误
- 一个 split 错误
- 一个统计错误
- 一个 archived evidence 问题
- 一个 dirty Git warning

每个 finding 点击后能查看对应 Claim / run 证据。

### 自动验收

fixture 中每条确定性错误都有 golden expected result。

不得出现漏掉 golden error 或凭空添加 error。

---

## M8：完整交互整合与侧边栏打磨

### 目标

将所有能力组合为连贯用户体验。

### 必须完成

- ResearchTree
- NodeDetail
- AuditReport
- 内部导航
- loading/error/empty 状态
- 当前运行状态刷新
- Chat → Sidebar 联动
- Sidebar → Chat/工具上下文联动（若官方能力允许）
- UI 信息密度优化

### 人工验收

从空项目完整走一遍：

1. 初始化
2. 创建研究问题/方法
3. 发起多个实验
4. 归档失败方法
5. 查询当前路线
6. 导入论文
7. trace Claim
8. audit
9. 在 Sidebar 中完成树→详情→报告导航

整个流程不得要求打开独立 ResearchTrace 网页。

---

## M9：真实安装、端到端测试与面试演示包

### 目标

证明插件不是只在开发 checkout 中才能工作。

### 必须完成

- bundle packaging
- isolated clean profile install
- uninstall/reinstall
- migration test
- README
- demo script
- architecture diagram（可用 Mermaid）
- test report

### 人工验收

在一个新的 Harness profile 中：

1. 安装 ResearchTrace bundle
2. 打开新的 fixture workspace
3. 完整执行 M8 流程
4. Harness 重启
5. 数据仍存在
6. 卸载插件不会删除用户项目原始科研文件

### 最终通过条件

M1–M9 所有 acceptance checklist 通过，自动测试无失败，README 能让第三方按步骤复现演示。

---

# 27. Codex 工作规范

Codex 必须遵循：

1. 每次开始工作先阅读本规格。
2. 先理解完整架构再实现当前里程碑。
3. 当前里程碑代码必须兼容后续模块，不写一次性死路。
4. 不擅自增加 W&B / MLflow / 云服务。
5. 不擅自创建独立 Web 后台。
6. 不擅自修改 `.researchtrace` 的产品语义。
7. 不修改本规格，除非人工明确要求。
8. 发现 Harness 官方 API 与规格的技术假设冲突时，停止该部分实现，在里程碑报告中提出兼容方案；产品行为优先保持。
9. 所有关键逻辑写测试。
10. 禁止用 mock 冒充真实 Harness 集成完成；mock 只能存在于自动测试。
11. 每完成一个里程碑必须：
    - 运行测试
    - 输出通过/失败数
    - 列出修改文件
    - 列出架构决策
    - 给出本地安装/运行步骤
    - 按 acceptance checklist 逐项报告
    - 给出 Git commit hash
    - 列出已知问题
12. 完成当前里程碑后停止，等待人工验收，不进入下一里程碑。

---

# 28. Codex 首次启动任务

将下面内容作为 Codex 第一次正式开发任务：

```text
请先完整阅读 docs/RESEARCHTRACE_SPEC.md。

这是 ResearchTrace 项目的唯一产品与技术规格来源。不要自行缩减产品范围，不要自行增加未经规格定义的核心功能，也不要把里程碑理解为不同产品版本。所有里程碑共同组成同一个完整产品。

开发原则：

1. 先理解完整产品架构，再开始编码，不能只根据当前里程碑做一次性实现。
2. 后续模块已经在规格中定义，因此当前代码必须为后续模块保留正确接口，避免为了当前功能写死架构。
3. ResearchTrace 是 DeepSeek Harness 的本地插件，所有数据本地保存，不实现云端服务，不集成 W&B、MLflow、DVC；可以参考它们的数据建模思想。
4. UI 只存在于 DeepSeek Harness 右侧 Sidebar，不开发独立 Web 管理后台。
5. 大模型负责语义任务，确定性程序负责 Git、文件、配置、指标、数据库、数值计算等确定性任务。
6. 所有关键功能必须有自动测试。
7. 不允许用 mock 或假数据冒充已完成的真实集成功能，除非规格明确要求测试夹具。
8. 每完成一个里程碑必须运行对应测试，并根据规格中的验收标准进行自检。
9. 每个里程碑完成后停止继续开发下一里程碑，等待人工验收。
10. 不要擅自修改规格文件。发现规格存在技术冲突时，在里程碑报告中提出，而不是自行改变产品行为。

现在请：

第一步：完整阅读规格说明书和项目现有文件。

第二步：先输出你对以下内容的理解：
- 整体产品架构
- 主要模块
- 核心数据流
- DeepSeek Harness 在系统中的角色
- 本地数据如何保存
- 各里程碑之间的依赖关系
- 你准备采用的项目目录结构

第三步：检查当前 DeepSeek Harness 官方插件机制和本机环境是否满足规格要求。涉及 Harness API、插件结构、右侧 Sidebar 扩展接口等快速变化的信息时，以当前官方仓库/文档为准，不要凭旧知识猜测。

第四步：只实施规格中的 M1。

M1 完成后：
- 运行全部 M1 自动测试
- 给出实际测试结果
- 列出新增/修改文件
- 给出在本机 DeepSeek Harness 测试 profile 中安装和运行的步骤
- 按 M1 验收标准逐项说明是否通过
- 给出当前 Git commit
- 明确列出已知问题

完成上述工作后停止，不要开始 M2，等待人工验收。
```

---

# 29. 最终面试叙事

ResearchTrace 的核心面试表达应保持一致：

> “我没有重新做一个 W&B。实验参数、指标、产物这类模型已经有成熟范式，所以我参考了 run/parameter/metric/artifact 的数据建模；我的重点是它们上面缺少的科研语义层。我把研究过程组织成研究演化树，记录方法为什么产生、为什么被否决，并让论文里的结论可以反向追溯到实验、配置、代码状态和数据划分，再做确定性一致性审计。整个插件本地运行，嵌在 DeepSeek Harness 的侧边栏里。”

---

# 30. 产品最终验收场景

最终演示必须能够连续完成以下故事，不剪辑、不依赖云端：

1. 打开本地科研项目。
2. 在 Harness 中初始化 ResearchTrace。
3. 创建“未来预测”研究问题和两条方法路线。
4. 用户说“跑一下 Future30”，ResearchTrace 创建并执行实验。
5. 实验完成后 Sidebar 显示指标、配置和 Git 状态。
6. 再跑一条失败方法的多个实验。
7. 用户说“这条方法不行，归档，以后默认别搜它”。
8. 查询“当前最好的路线”，系统不使用已归档方法。
9. 查询“当时为什么放弃它”，系统能恢复历史决策与证据。
10. 导入 Markdown / LaTeX / Word 中至少一种真实论文样例。
11. 点击或询问一个论文数字，系统追到对应 run/config/Git/split。
12. 人为把论文中的一个数字改错。
13. 运行提交前审计。
14. Sidebar 报告错误并给出论文证据、实验事实和修复建议。
15. 关闭 Harness 再打开，研究树、决策、实验和审计历史仍存在。

如果这条故事能够稳定走通，ResearchTrace 就达到面试项目的完整交付标准。
