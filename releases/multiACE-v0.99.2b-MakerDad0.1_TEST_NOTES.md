# multiACE v0.99.2b-MakerDad0.1 测试说明

## 本版修正

- Web 显示版本号改为 `v0.99.2b-MakerDad0.1`。
- `MULTIACE_BUILD_TAG` 清空，避免 Web 显示成 `vv...+MakerDad...`。
- 退料路径回退到原版稳定策略：
  - `ACE_UNLOAD_HEAD` 不再为 V2/ACE2 Pro 启动退料专用反向 feed assist。
  - 屏幕触发的 `FEED_AUTO ... UNLOAD=1` 也不再调用 `_v2_arm_fa_for_unload()`。
  - 退料前会关闭 `_v2_active_rev_assist`，并对 V2 当前辅助槽位执行 `stop_feed_assist`。
- 打印时里程/辅助送料监控仍保留，只在打印态判断，不参与退料流程。
- 小太阳烘干弹窗：
  - 保存自动烘干设置后自动关闭当前弹窗。
  - 切换相邻 ACE 卡片时先关闭烘干弹窗。
  - 弹窗加入稳定 key，避免相邻 ACE 面板视觉串联展开。

## 退料重点测试

1. Web 端分别点击 T0/T1/T2/T3 退料。
2. 打印机屏幕端分别执行自动退料。
3. 每次退料前观察日志，应该不再出现退料阶段启用 `_v2_active_rev_assist` 或 `_v2_arm_fa_for_unload`。
4. 若仍失败，请拉取最新 `klippy.log`、`multiace_fa.log`、`multiace_state.log`，重点看 `FEED_AUTO ... UNLOAD=1` 前后的报错。

## 自动烘干测试

1. 打开 ACE2 Pro 小太阳弹窗。
2. 设置自动烘干参数并保存，弹窗应关闭。
3. 再打开相邻 ACE 设置/卡片，左侧已保存的弹窗不应跟着展开。

## 包文件

- `multiACE-v0.99.2b-MakerDad0.1.zip`
