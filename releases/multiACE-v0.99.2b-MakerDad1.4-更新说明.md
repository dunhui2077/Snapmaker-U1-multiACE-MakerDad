# multiACE v0.99.2b-MakerDad1.4 更新说明

## 修复超过 8 色换料后起始缺料

分析 `ACE_SWAP_HEAD` 打印中换料流程后确认：

1. 后处理 G-code 会把 `T4..T15` 改写为 `T0..T3 + ACE_SWAP_HEAD HEAD=n ACE=m SLOT=s`。
2. `ACE_SWAP_HEAD` 会卸载旧料、加载新料、执行 `ROUGHLY_CLEAN_NOZZLE_WITH_DISCARD`。
3. 随后旧逻辑默认执行 `G1 E-10 F1800`，也就是 `swap_anti_ooze_retract: 10`。
4. 之后 `ACE_SWAP_HEAD` 为了恢复切片器的 E 坐标，会把这段 E 变化写入 `gcode_move.base_position`。
5. 结果是切片器恢复打印时看起来 E 坐标正确，但物理喷嘴已经回抽了约 10mm，第一段路径会缺料。

本版修改：

- `swap_anti_ooze_retract` 默认改为 `0`。
- 即使用户旧配置中仍保留 `swap_anti_ooze_retract: 10`，打印中 `ACE_SWAP_HEAD` 也会禁用这段后置回抽，避免隐藏回抽导致欠料。
- 保留清嘴流程 `ROUGHLY_CLEAN_NOZZLE_WITH_DISCARD`，不改变原有卸料/装料主流程。

## 测试建议

- 使用超过 8 色、会触发 `ACE_SWAP_HEAD` 的文件测试。
- 重点观察每次换色后的第一段打印路径，理论上不应再出现固定长度的起始缺料。
- 如果仍有轻微缺料，下一步应检查 `ROUGHLY_CLEAN_NOZZLE_WITH_DISCARD` 是否对小面积/无擦料塔场景冲刷不足，而不是后置回抽问题。

