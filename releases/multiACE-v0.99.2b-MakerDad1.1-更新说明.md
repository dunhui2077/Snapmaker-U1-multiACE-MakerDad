# multiACE v0.99.2b-MakerDad1.1 更新说明

## 本次修复

- 修复 `1.0` 在打印刚开始就频繁暂停的问题。
- 调整 ACE2 Pro 送料 watchdog 的判定优先级：
  - 优先判断 `GET_KEY_STATE` 缓冲器位置。
  - 在 `GET_KEY_STATE` 和 `GET_FEED_INFO` 正常返回时，视为当前 ACE 通信链路正常。
  - 通信正常且缓冲器未到最外侧时，不使用里程数据触发暂停。
  - 通信正常且缓冲器在最外侧，但本次打印还没有建立过该路里程基线时，只重发/唤醒辅助送料，不暂停。
  - 打印开始前 20 秒属于启动宽限窗口，只做 soft rearm 和日志记录，不因缺少里程基线暂停。
  - 一旦该路在本次打印中已经出现过里程增长，后续若缓冲器持续最外侧且里程停止，才进入重发确认和暂停流程。

## 默认参数

- 新增 `v2_feed_watchdog_start_grace: 20.0`
- 新增 `v2_feed_watchdog_rearm_grace: 4.0`
- 保留 `v2_feed_watchdog_pause_after: 1`，但暂停只会发生在已经建立里程基线后的确认故障。

## 验证

- `python3 -m py_compile` 通过。
- `node --check` 通过。
- 多语言 JSON 语法检查通过。
