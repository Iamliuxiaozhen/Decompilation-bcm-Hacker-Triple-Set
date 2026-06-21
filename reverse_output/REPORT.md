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
