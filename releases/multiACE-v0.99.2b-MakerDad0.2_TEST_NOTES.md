multiACE v0.99.2b-MakerDad0.2 测试说明

本版针对“退料正常后，换料再点击进料报错”修复：

1. V2 里程信息输出改为 JSON 安全格式。
   - 若 ACE2 Pro 返回异常超大 steps/length/decoder，Web 状态不会再触发 `json encoding error: Integer exceeds 64-bit range`。
   - 异常值会写入 `multiace_feedlog.log`，并保留上一帧有效里程用于 UI 展示。

2. `FEED_AUTO LOAD` 成功后不再无条件关闭 V2 辅助送料。
   - 成功进料后保持当前 ACE/槽位处于 feed assist 待命状态。
   - 失败时仍会关闭/清理 feed assist，避免旧状态影响下一次操作。

3. 状态审计日志中的耗材颜色改为 `filament_color_rgba` 字符串，避免无符号 ARGB 整数干扰排查。

建议测试顺序：

1. 安装包并重启 Klipper/multiACE Web。
2. 对同一喷头执行：退料 -> 换料 -> 点击进料。
3. 观察 Web/屏幕是否不再出现 `json encoding error`。
4. 进料成功后查看对应 ACE2 Pro 槽位是否仍能保持辅助送料待命。
5. 若仍提示“进料堵塞”，重点检查该喷头进料传感器是否在 ACE 送料后正常触发，并保留 `klippy.log`、`multiace_fa.log`、`multiace_feedlog.log`。
