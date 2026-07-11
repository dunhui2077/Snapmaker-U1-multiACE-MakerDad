# multiACE v0.99.2b-MakerDad0.9 更新说明

## 本次重点

- 修复打印中 ACE2 Pro 送料里程 watchdog 过于频繁暂停的问题。
- 新增 ACE2 Pro `GET_KEY_STATE` 缓冲器位置解析，优先用真实霍尔位判断当前槽位是否已到最外侧。
- 实测位图：
  - 全部原位：`field1=17476`，原位 bits `2/6/10/14`
  - 1 路最外侧：`field1=83008`，1 路原位 bit 清除，共享外侧 bit `16` 置位
  - 1 路最内侧：`field1=17480`，1 路内侧 bit `3` 置位
  - 2 路最外侧：`field1=82948`，2 路原位 bit 清除，共享外侧 bit `16` 置位

## 新 watchdog 逻辑

- 打印路径有挤出但没有 ACE 里程时，先读取当前 ACE 的缓冲器位置。
- 当前槽位仍在原位或内侧时，不判定故障，不暂停。
- 只有当前槽位离开原位且共享最外侧霍尔触发后，才要求 ACE 里程同步增长。
- 如果最外侧触发后仍没有里程，先发送 `get_status` 和 `start_feed_assist` 唤醒/重发辅助送料。
- 唤醒后下一轮仍无里程，才暂停打印，并显示明确故障信息，提示检查料路、缓冲器、ACE 电源和 USB-RS485 链路。

## 默认参数调整

- `v2_feed_watchdog_assist_grace` 默认从 `0.35` 调整到 `0.75` 秒。
- 新增 `v2_feed_watchdog_buffer_slack: 3.0`，用于缓冲器触发后的短距离宽限，避免刚触发外侧时误判。

## 验证

- `python3 -m py_compile` 通过。
- `node --check` 前端脚本通过。
- `python3 -m json.tool` 多语言 JSON 通过。
