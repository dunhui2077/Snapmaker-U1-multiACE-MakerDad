# multiACE v0.99.2b-MakerDad0.4 更新说明

- 烘干参数面板恢复为每台 ACE 独立展开：点击哪台 ACE 的小太阳，只在那台 ACE 卡片内展开参数，其它 ACE 不展开、不显示空白。
- 烘干面板压缩高度和间距，并改为不透明背景，避免线材连接线遮挡阅读。
- 自动烘干风扇参数从 UI 和配置中移除，自动烘干固定按 100% 风扇发送。
- 配置页全局参数中新增“准许打印温度 (°C)”，默认 40°C；所有 ACE 共用这个全局温度保护。
- ACE 小太阳面板内不再显示准许打印温度。

静态检查：
- node --check app.js
- python3 -m py_compile ace.py main.py
- python3 -m json.tool zh/en/de.json
