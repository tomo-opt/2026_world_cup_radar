# 数据说明

- 当前赛程使用 `C:\Users\14916\Desktop\2026_world_cup_radar\data\seeds\world_cup_2026_latest_image_schedule_utf8.csv` 与 `C:\Users\14916\Desktop\2026_world_cup_radar\data\seeds\world_cup_2026_latest_image_schedule.json`。
- 104 场比赛均包含 `kickoff_beijing` 与 `kickoff_utc` 字段。
- 当前赛程来自用户最新版赛程图片的人工转录稿。
- 旧 HTML 赛程文件仅作为历史参考，不作为前台赛程源。
- 不会将 `欧预胜者`、`FIFA附加赛`、`附加赛` 等旧占位队伍重新写入前台。
- 若后续用户提供 FIFA 官方 CSV 或人工校对版 CSV，应优先覆盖当前 seed。
