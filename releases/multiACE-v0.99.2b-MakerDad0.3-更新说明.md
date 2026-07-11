# multiACE v0.99.2b-MakerDad0.3 更新说明

- 自动烘干改为闲置湿度闭环：不再在 UI 中共用手动烘干时长，自动烘干启动后由停止湿度、用户关闭自动烘干、或打印开始停止。
- ACE2 Pro 自动烘干新增风扇速度参数，范围 50%-100%，默认 70%。
- 准许打印温度默认改为 40°C，并放入小太阳烘干设置面板。
- 打印开始时会立即停止所有 ACE2 Pro 自动烘干；若任意 V2 ACE 舱温达到或高于阈值，Klipper 自动暂停打印，轮询降温，低于阈值后自动 RESUME。
- 小太阳 UI 改为一个全局烘干设置面板，点击任意 ACE 小太阳时显示所有 ACE 模块参数，避免其它 ACE 下拉空白。
- Web 红色高温等待文案加入中/英/德翻译，并随语言切换刷新。

静态检查：
- node --check app.js
- python3 -m py_compile ace.py main.py
- python3 -m json.tool zh/en/de.json
