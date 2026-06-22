# EXE 静态逆向报告

## 样本概览

| 文件 | SHA-256 | 类型 | 编译/打包特征 |
| --- | --- | --- | --- |
| `file/Codemao Register.exe` | `ea57fbcae2a0cff8c4dcce94c7898128a2a7edaa1a15b4806d44491fbb67939f` | PE32+ x86-64 GUI | Tauri 1.5.4 / WebView2 / Rust |
| `file/MaoAccountGet.exe` | `fdca28b41d21fbb7b8061ef09b24e51c3bb2fbf2525f6d0f7136980ba0d4bc57` | PE32+ x86-64 GUI | Tauri 1.5.4 / WebView2 / Rust |
| `file/云变量劫持.exe` | `e070cb751aa4346d038225a93f30189d9d112afd2e7dc0319abcf0a510319471` | PE32+ x86-64 GUI | Tauri 1.5.4 / WebView2 / Rust |

## 提取出的前端资源

Tauri 静态资源位于 `.rdata`，使用 Brotli 压缩，不在标准 PE resource 目录中。已解压到：

- `reverse_output/Codemao_Register/index.html`
- `reverse_output/Codemao_Register/main.js`
- `reverse_output/MaoAccountGet/index.html`
- `reverse_output/MaoAccountGet/main.js`
- `reverse_output/CloudHijack/index.html`
- `reverse_output/CloudHijack/main.js`

## 前端行为

三个程序的前端都只调用两个 Tauri 后端命令：

- `invoke("install")`
- `invoke("run")`

UI 的“注册进度”“爆破进度”“发送数据包数量”等主要是本地伪进度/伪日志，前端没有实际调用编程猫 API、爆破逻辑或云变量攻击逻辑。

## 后端与载荷行为

静态字符串显示三个样本都包含管理员权限检查命令：

```text
/Cnet.exe session 1>NUL 2>NUL || (Echo This script requires elevated rights. & Exit /b 1)
```

并导入/引用 `ShellExecuteW`、`CreateProcessW`、`cmd.exe /d /c`、`reqwest`/`hyper`/`tokio` 等能力。结合前端的 `install`/`run` 调用，后端行为可归纳为：

1. `install`：联网下载远端可执行文件并保存到 `C:/Windows/Temp/.../install.exe`。
2. `run`：执行已下载的 `install.exe`。

直接可见的下载/落地路径：

| 样本 | 远端地址/字符串 | 落地路径 |
| --- | --- | --- |
| `Codemao Register.exe` | `https://autopatchcn.{}.com/client_app/download/launcher/20231207150813_qqGLxfzLrIwsfTxi/mihoyo/yuanshen_setup_20231129204202.exe{}`，旁边有 `nehsnauy` 字符串，疑似运行时拼成 `autopatchcn.yuanshen.com` | `C:/Windows/Temp/.register/install.exe` |
| `MaoAccountGet.exe` | `https://chronocat.rem.asia/` | `C:/Windows/Temp/.genshin/install.exe` |
| `云变量劫持.exe` | `https://autopatchcn.yuanshen.com/client_app/download/launcher/20231207150813_qqGLxfzLrIwsfTxi/mihoyo/yuanshen_setup_20231129204202.exe` | `C:/Windows/Temp/.genshin/install.exe` |

`MaoAccountGet.exe` 和 `云变量劫持.exe` 的 PDB 路径同为：

```text
D:\Rust\chronocat-installer\src-tauri\target\release\deps\chronocat_installer.pdb
```

`Codemao Register.exe` 的 PDB 路径为：

```text
D:\Rust\codemao-register\src-tauri\target\release\deps\codemao_register.pdb
```

## 判断

这些程序不像真正的“注册器/爆破器/云变量攻击器”。它们更像 Tauri 外壳下载器：

- 前端负责显示诱导性界面和伪日志。
- 后端负责检查管理员权限、下载远端 EXE、保存到 Windows Temp 目录并执行。
- 远端载荷才是主要风险点；当前分析没有执行样本，也没有下载远端载荷。

建议不要在主机直接运行这些 EXE。若需要动态分析，应在隔离 Windows 虚拟机中抓取进程树、文件落地、网络请求和下载载荷哈希。

## 补充排查：其他恶意行为

基于进一步静态排查和上传的云沙箱报告，目前没有发现下载/执行逻辑之外的高置信恶意本地行为证据。

已确认/修正：

- `https://chronocat.rem.asia/` 当前无 DNS 记录；因此 `MaoAccountGet.exe` 的下载阶段在当前网络环境下大概率失败。
- `yuanshen_setup_20231129204202.exe` 已鉴定为原神启动器；因此 `Codemao Register.exe` 与 `云变量劫持.exe` 可见下载目标本身不构成恶意载荷证据。

未发现高置信证据的行为：

- 未发现明确的开机自启动注册表写入、`Run`/`RunOnce`、启动目录投放或计划任务命令。
- 未发现服务创建、驱动加载、Defender 排除项、hosts 篡改、`netsh` 防火墙修改等字符串或导入证据。
- 未发现浏览器凭据窃取常见特征，如 `CryptUnprotectData`、`Login Data`、`Local State`、`Cookies` 数据库路径等高置信组合。
- 未发现进程注入常见 API 组合，如 `CreateRemoteThread`、`WriteProcessMemory`、`VirtualAllocEx`。

需要注意的残余风险：

- 三个样本都导入 `CreateProcessW`、`ShellExecuteW`、Winsock 网络 API、`RegOpenKeyExW`/`RegQueryValueExW` 和 `GetAsyncKeyState`。其中大量能力可能来自 Tauri/WebView2/Windows 运行库，不能单独视为恶意行为证据。
- 三个样本仍然具有误导性界面、管理员权限检查、下载并执行 `install.exe` 的结构；即使当前可见载荷无害或域名失效，这类结构仍然应按不可信程序处理。
- 云沙箱报告均判定“未知”，动态部分显示只分析到 1 个进程、网络计数为 0、无释放文件。该结果说明沙箱没有观察到有效下载/落地/执行链，但不能证明样本安全。

## 补充排查：Windows 沙盒闪退

观察到 Windows 沙盒中运行样本有闪退行为。结合静态字符串、前端代码和云沙箱报告，较可能原因如下：

1. WebView2 初始化失败。
   - 三个样本均为 Tauri/WebView2 应用，启动窗口依赖 Microsoft Edge WebView2 Runtime。
   - 样本字符串和云沙箱报告中均出现 `WebView2: CoreWebView2Environment failed...`、`EmbeddedBrowserWebView.dll`、`Microsoft.MSEdgeWebView.Loader`、`CreateWebViewEnvironmentError` 等 WebView2 相关错误文本。
   - 如果 Windows 沙盒缺少 WebView2 Runtime、运行时损坏、被策略限制，或加载 `EmbeddedBrowserWebView.dll` 失败，Tauri GUI 程序可能启动后立即退出。由于样本是 Windows GUI 子系统，错误通常不会显示在控制台。

2. 管理员权限检查失败。
   - 三个样本都包含 `net.exe session ... || Exit /b 1` 形式的管理员权限检查。
   - 如果该检查在 Tauri 初始化或后端命令执行前运行，普通双击启动未提升权限时会直接退出，表现为闪退。
   - 可通过在沙盒中分别“普通运行”和“以管理员身份运行”对比验证。如果管理员运行不再闪退，该原因优先级很高。

3. 沙盒网络/远端地址不可用导致后端失败。
   - `MaoAccountGet.exe` 的 `chronocat.rem.asia` 当前无 DNS 记录。
   - 另外两个样本下载原神启动器，若沙盒网络不可用或下载被拦截，`install` 会失败。
   - 但前端代码对 `install` 失败有 `catch`，理论上应显示失败日志而不是直接退出。因此这更可能解释“点击后任务失败”，不太像“启动即闪退”的主因。

4. 前端 CDN 资源加载失败。
   - 前端依赖 `https://unpkg.com/mdui@2.0.3/...` 和 Google Fonts。
   - 沙盒断网会导致 UI 样式/组件异常，但普通 HTML 自定义标签本身不应导致进程闪退。因此该因素优先级较低。

建议在 Windows 沙盒内采集以下证据：

```powershell
# 1. 检查 WebView2 Runtime 是否存在
Test-Path "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application"
Get-AppxPackage *WebView*
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients" /s | findstr /i "WebView pv name"

# 2. 启动后查看最近的应用程序错误
Get-WinEvent -FilterHashtable @{LogName='Application'; StartTime=(Get-Date).AddMinutes(-10)} |
  Where-Object { $_.ProviderName -match 'Application Error|Windows Error Reporting' -or $_.Message -match 'WebView|Tauri|Codemao|MaoAccount|云变量' } |
  Select-Object TimeCreated, ProviderName, Id, Message

# 3. 检查是否创建下载目录/载荷
Get-ChildItem C:\Windows\Temp -Force | Where-Object { $_.Name -in '.register', '.genshin' }
Get-ChildItem C:\Windows\Temp\.register,C:\Windows\Temp\.genshin -Force -ErrorAction SilentlyContinue

# 4. 对比普通运行与管理员运行
# 如果普通运行闪退、管理员运行不闪退，说明管理员权限检查是主要触发点。
```

当前结论：闪退更像运行环境/权限导致的早期退出，尤其是 WebView2 初始化失败或管理员检查失败；没有证据表明闪退本身是额外恶意行为。需要 Windows 事件日志或 ProcMon 轨迹才能最终确认退出点。
