# html 始终带已解析的亮暗主题

访客「现在是亮还是暗」曾分叉：`theme-color` 脚本写死纸色 hex，微粒和首页双图各自复制 `data-theme` 与 `prefers-color-scheme`。纸色只属于 CSS token（`--background`）；脚本先写入已解析的 `data-theme`（有记忆用记忆，否则跟系统），再读取 computed `--background` 填 `theme-color`。无记忆时系统变化会更新 `data-theme` 但不写 localStorage。静态 `theme-color` 仍用亮色纸作无脚本回退。微粒和双图只认 `data-theme`。键名仍是 `theme` / `jasper-theme`（ADR-0023）。
