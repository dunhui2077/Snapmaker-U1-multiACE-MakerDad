# multiACE v0.99.2b-MakerDad1.3 更新说明

## 重点修复

- 新增 ACE2 Pro 挤出机侧卡料/空打检测桥接。
- 原厂 U1 的 `filament_entangle_detect` 依赖原机侧送料轮计数，multiACE 连接 ACE 路径后会禁用它，避免拓扑不匹配误报。
- 本版在 multiACE 内新增等效保护：当当前喷头正在打印、喷头传感器仍检测到有料、ACE 通讯正常、对应 ACE 缓冲器一直保持原位，并且挤出机连续推进但 ACE 里程没有变化时，触发 Snapmaker 原厂同类 523/38 `detect filament tangled!` 报警并暂停。

## 新增配置

位于 `ace.cfg`：

```ini
v2_toolhead_jam_watchdog: true
v2_toolhead_jam_skip: 20.0
v2_toolhead_jam_min_extrude: 12.0
v2_toolhead_jam_grace: 6.0
```

含义：

- `v2_toolhead_jam_watchdog`：开启挤出机侧卡料/空打保护。
- `v2_toolhead_jam_skip`：每次进入连续原位怀疑状态后先跳过的挤出长度，参考原厂 `skip_length`，避免打印开始或换头后短时间误判。
- `v2_toolhead_jam_min_extrude`：跳过后仍在异常状态下累计的最小挤出长度。
- `v2_toolhead_jam_grace`：异常状态需要持续的最短时间。

## 测试建议

1. 正常打印观察是否不再出现打印开始频繁误暂停。
2. 人为制造挤出机齿轮处卡料/断料，缓冲器保持原位时，应在约 `20mm + 12mm` 的有效挤出后触发原厂空打/缠料类报警并暂停。
3. 如果保护过慢，可先把 `v2_toolhead_jam_min_extrude` 从 `12.0` 调到 `8.0`；如果误报，再调高到 `16.0`。

