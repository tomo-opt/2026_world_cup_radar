# 数据源覆盖报告

- 总源数：102
- enabled 源数：102
- 成功源数：69
- 成功率：67.65%
- 目标成功率：60%
- 前台纳入源数：20

## 按失败类型统计
- success: 21
- trends_test_pending: 48
- html_parse_no_items: 23
- timeout_or_connection: 10

## 按 source_type 统计
- official: 4
- media_fixture: 2
- trends: 48
- media: 39
- media_reference: 1
- forum: 3
- open_social: 5

## 按 crawl_mode 统计
- manual_reference: 3
- fixture: 2
- trend_test: 48
- html_list: 38
- rss: 10
- html_article_links: 1

## 明细

| 来源 | 类型 | 模式 | 尝试策略 | 成功策略 | 有效条目 | discovered_feeds | discovered_sitemaps | 状态 | 失败分类 | 下一步 |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| FIFA World Cup 2026 Official Match Schedule Article | official | manual_reference | page_reference | page_reference | 1 |  |  | manual_export_supported | — | 已抓到有效条目，可继续优化相关性。 |
| FIFA World Cup 2026 Scores & Fixtures | official | fixture | page_reference | page_reference | 1 |  |  | partial | — | 已抓到有效条目，可继续优化相关性。 |
| Sky Sports FIFA World Cup Scores & Fixtures | media_fixture | fixture | page_reference | page_reference | 1 |  |  | partial | — | 已抓到有效条目，可继续优化相关性。 |
| ESPN 2026 FIFA World Cup Match Schedule | media_fixture | manual_reference | page_reference | page_reference | 1 |  |  | manual_export_supported | — | 已抓到有效条目，可继续优化相关性。 |
| Google Trends Sports - United States | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - United Kingdom | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Canada | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Mexico | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Brazil | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Argentina | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Spain | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - France | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Germany | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Italy | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Japan | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - South Korea | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| ESPN Soccer | media | html_list | html_list, json_ld, sitemap | — | 0 | https://www.espn.com/feed<br/>https://www.espn.com/rss<br/>https://www.espn.com/rss.xml<br/>https://www.espn.com/feed.xml<br/>https://www.espn.com/football/rss<br/>https://www.espn.com/soccer/rss<br/>https://www.espn.com/world-cup/rss<br/>https://www.espn.com/feed/ |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| ESPN Soccer Worldcup Page | media | html_list | html_list, json_ld, sitemap | — | 0 | https://www.espn.com/feed<br/>https://www.espn.com/rss<br/>https://www.espn.com/rss.xml<br/>https://www.espn.com/feed.xml<br/>https://www.espn.com/football/rss<br/>https://www.espn.com/soccer/rss<br/>https://www.espn.com/world-cup/rss<br/>https://www.espn.com/feed/ |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| ESPN Soccer RSS Feeds Info Page | media_reference | manual_reference | page_reference | page_reference | 1 |  |  | manual_export_supported | — | 已抓到有效条目，可继续优化相关性。 |
| BBC Sport Football Worldcup Page | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| BBC Sport Football | media | rss | rss_direct | — | 0 | https://feeds.bbci.co.uk/sport/football/rss.xml |  | error | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| The Guardian Football Worldcup 2026 Page | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| The Guardian Football | media | rss | rss_direct | — | 0 | https://www.theguardian.com/football/rss |  | error | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Sky Sports Football | media | html_list | og_meta, html_list, json_ld | html_list | 25 | https://www.skysports.com/feed<br/>https://www.skysports.com/rss<br/>https://www.skysports.com/rss.xml<br/>https://www.skysports.com/feed.xml<br/>https://www.skysports.com/football/rss<br/>https://www.skysports.com/soccer/rss<br/>https://www.skysports.com/world-cup/rss<br/>https://www.skysports.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| Sky Sports Football News Page | media | html_list | og_meta, html_list, json_ld | html_list | 16 | https://www.skysports.com/feed<br/>https://www.skysports.com/rss<br/>https://www.skysports.com/rss.xml<br/>https://www.skysports.com/feed.xml<br/>https://www.skysports.com/football/rss<br/>https://www.skysports.com/soccer/rss<br/>https://www.skysports.com/world-cup/rss<br/>https://www.skysports.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| Reuters Soccer | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| ESPN Deportes Fútbol | media | html_list | html_list, json_ld, sitemap | — | 0 | https://espndeportes.espn.com/feed<br/>https://espndeportes.espn.com/rss<br/>https://espndeportes.espn.com/rss.xml<br/>https://espndeportes.espn.com/feed.xml<br/>https://espndeportes.espn.com/football/rss<br/>https://espndeportes.espn.com/soccer/rss<br/>https://espndeportes.espn.com/world-cup/rss<br/>https://espndeportes.espn.com/feed/ |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| ESPN Deportes Fútbol Mundial | media | html_list | html_list, json_ld, sitemap | — | 0 | https://espndeportes.espn.com/feed<br/>https://espndeportes.espn.com/rss<br/>https://espndeportes.espn.com/rss.xml<br/>https://espndeportes.espn.com/feed.xml<br/>https://espndeportes.espn.com/football/rss<br/>https://espndeportes.espn.com/soccer/rss<br/>https://espndeportes.espn.com/world-cup/rss<br/>https://espndeportes.espn.com/feed/ |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| AS Fútbol | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| AS Fútbol Mundial 2026 | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Marca Fútbol | media | html_list | og_meta, html_list, json_ld | html_list | 25 | https://www.marca.com/rss/googlenews/portada.xml<br/>https://www.marca.com/rss/googlenews/futbol.xml<br/>https://www.marca.com/feed<br/>https://www.marca.com/rss<br/>https://www.marca.com/rss.xml<br/>https://www.marca.com/feed.xml<br/>https://www.marca.com/football/rss<br/>https://www.marca.com/soccer/rss<br/>https://www.marca.com/world-cup/rss<br/>https://www.marca.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| Marca Fútbol Noticias | media | html_list | og_meta, html_list, json_ld | html_list | 25 | https://www.marca.com/rss/googlenews/portada.xml<br/>https://www.marca.com/rss/googlenews/futbol.xml<br/>https://www.marca.com/feed<br/>https://www.marca.com/rss<br/>https://www.marca.com/rss.xml<br/>https://www.marca.com/feed.xml<br/>https://www.marca.com/football/rss<br/>https://www.marca.com/soccer/rss<br/>https://www.marca.com/world-cup/rss<br/>https://www.marca.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| L'Équipe Football | media | html_list | og_meta, html_list, json_ld | html_list | 25 | https://www.lequipe.fr/feed<br/>https://www.lequipe.fr/rss<br/>https://www.lequipe.fr/rss.xml<br/>https://www.lequipe.fr/feed.xml<br/>https://www.lequipe.fr/football/rss<br/>https://www.lequipe.fr/soccer/rss<br/>https://www.lequipe.fr/world-cup/rss<br/>https://www.lequipe.fr/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| L'Équipe Football Coupe du Monde | media | html_list | og_meta, html_list, json_ld | html_list | 25 | https://www.lequipe.fr/feed<br/>https://www.lequipe.fr/rss<br/>https://www.lequipe.fr/rss.xml<br/>https://www.lequipe.fr/feed.xml<br/>https://www.lequipe.fr/football/rss<br/>https://www.lequipe.fr/soccer/rss<br/>https://www.lequipe.fr/world-cup/rss<br/>https://www.lequipe.fr/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| Kicker Fußball | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Globo Esporte Futebol | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Globo Esporte Futebol Copa do Mundo | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Olé Argentina Mundial 2026 Page | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Reddit r/soccer | forum | rss | rss_direct | — | 0 | https://www.reddit.com/r/soccer/.rss |  | error | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Reddit r/football | forum | rss | rss_direct | — | 0 | https://www.reddit.com/r/football/.rss |  | error | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Reddit r/worldcup | forum | rss | rss_direct | — | 0 | https://www.reddit.com/r/ussoccer/.rss |  | error | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Mastodon hashtag #WorldCup | open_social | rss | rss_direct | — | 0 | https://mastodon.social/tags/WorldCup.rss |  | error | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Mastodon hashtag #FIFAWorldCup | open_social | rss | rss_direct | — | 0 | https://mastodon.social/tags/FIFAWorldCup.rss |  | error | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Mastodon hashtag #WorldCup2026 | open_social | rss | rss_direct | — | 0 | https://mastodon.social/tags/WorldCup2026.rss |  | error | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Mastodon hashtag #football | open_social | rss | rss_direct | — | 0 | https://mastodon.social/tags/football.rss |  | error | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Mastodon hashtag #soccer | open_social | rss | rss_direct | — | 0 | https://mastodon.social/tags/soccer.rss |  | error | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Daily Mail Football Page | media | html_list | og_meta, html_list, json_ld | html_list | 25 | https://www.dailymail.com/sport/football/index.rss<br/>https://www.dailymail.com/sport/football/articles.rss<br/>https://www.dailymail.com/sport/articles.rss<br/>https://www.dailymail.com/feed<br/>https://www.dailymail.com/rss<br/>https://www.dailymail.com/rss.xml<br/>https://www.dailymail.com/feed.xml<br/>https://www.dailymail.com/football/rss<br/>https://www.dailymail.com/soccer/rss<br/>https://www.dailymail.com/world-cup/rss<br/>https://www.dailymail.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| Daily Mail World Cup Page | media | html_list | og_meta, html_list, json_ld | html_list | 25 | https://www.dailymail.com/sport/fifa-world-cup/index.rss<br/>https://www.dailymail.com/sport/fifa-world-cup/articles.rss<br/>https://www.dailymail.com/sport/articles.rss<br/>https://www.dailymail.com/feed<br/>https://www.dailymail.com/rss<br/>https://www.dailymail.com/rss.xml<br/>https://www.dailymail.com/feed.xml<br/>https://www.dailymail.com/football/rss<br/>https://www.dailymail.com/soccer/rss<br/>https://www.dailymail.com/world-cup/rss<br/>https://www.dailymail.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| Four Four Two News | media | html_list | og_meta, html_list, json_ld | html_list | 24 | https://www.fourfourtwo.com/feeds.xml<br/>https://www.fourfourtwo.com/feeds/articletype/news<br/>https://www.fourfourtwo.com/feed<br/>https://www.fourfourtwo.com/rss<br/>https://www.fourfourtwo.com/rss.xml<br/>https://www.fourfourtwo.com/feed.xml<br/>https://www.fourfourtwo.com/football/rss<br/>https://www.fourfourtwo.com/soccer/rss<br/>https://www.fourfourtwo.com/world-cup/rss<br/>https://www.fourfourtwo.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| Transfermarkt News | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| The Sun World Cup Page | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Yahoo Sport World Cup Page | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| One Football World Cup Page | media | html_list | og_meta, html_list, json_ld, wp_json | html_list | 13 | https://onefootball.com/feed<br/>https://onefootball.com/rss<br/>https://onefootball.com/rss.xml<br/>https://onefootball.com/feed.xml<br/>https://onefootball.com/football/rss<br/>https://onefootball.com/soccer/rss<br/>https://onefootball.com/world-cup/rss<br/>https://onefootball.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| Sports Illustrated World Cup Page | media | html_list | og_meta, html_list, json_ld | html_list | 25 | https://www.si.com/feed<br/>https://www.si.com/rss<br/>https://www.si.com/rss.xml<br/>https://www.si.com/feed.xml<br/>https://www.si.com/football/rss<br/>https://www.si.com/soccer/rss<br/>https://www.si.com/world-cup/rss<br/>https://www.si.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| NBC Sports World Cup Page | media | html_list | og_meta, html_list, json_ld | html_list | 14 | https://www.nbcsports.com/soccer/world-cup.atom<br/>https://www.nbcsports.com/feed<br/>https://www.nbcsports.com/rss<br/>https://www.nbcsports.com/rss.xml<br/>https://www.nbcsports.com/feed.xml<br/>https://www.nbcsports.com/football/rss<br/>https://www.nbcsports.com/soccer/rss<br/>https://www.nbcsports.com/world-cup/rss<br/>https://www.nbcsports.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| Goal World Cup News Page | media | html_list | og_meta, html_list, json_ld | html_list | 25 | https://www.goal.com/feed<br/>https://www.goal.com/rss<br/>https://www.goal.com/rss.xml<br/>https://www.goal.com/feed.xml<br/>https://www.goal.com/football/rss<br/>https://www.goal.com/soccer/rss<br/>https://www.goal.com/world-cup/rss<br/>https://www.goal.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| Fox Sports World Cup News Page | media | html_list | og_meta, html_list, json_ld, wp_json | html_list | 25 | https://www.foxsports.com/feed<br/>https://www.foxsports.com/rss<br/>https://www.foxsports.com/rss.xml<br/>https://www.foxsports.com/feed.xml<br/>https://www.foxsports.com/football/rss<br/>https://www.foxsports.com/soccer/rss<br/>https://www.foxsports.com/world-cup/rss<br/>https://www.foxsports.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| CBS Sports World Cup News Page | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Google Trends Sports - Australia | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - New Zealand | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Portugal | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Netherlands | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Uruguay | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Colombia | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Ecuador | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Paraguay | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Morocco | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Senegal | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Ghana | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Egypt | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Algeria | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Tunisia | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - South Africa | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Saudi Arabia | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Qatar | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Iran | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Iraq | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Jordan | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Türkiye | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Switzerland | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Belgium | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Croatia | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Sweden | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Norway | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Austria | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Czechia | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Bosnia and Herzegovina | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Panama | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Haiti | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Cape Verde | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Curaçao | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Ivory Coast | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - DR Congo | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Uzbekistan | trends | trend_test | page_reference | page_reference | 1 |  |  | test_pending | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| FIFA World Cup 2026 Teams | official | html_list | html_list, json_ld, sitemap | — | 0 | https://www.fifa.com/feed<br/>https://www.fifa.com/rss<br/>https://www.fifa.com/rss.xml<br/>https://www.fifa.com/feed.xml<br/>https://www.fifa.com/football/rss<br/>https://www.fifa.com/soccer/rss<br/>https://www.fifa.com/world-cup/rss<br/>https://www.fifa.com/feed/ |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| FIFA Qualified Teams for World Cup 2026 | official | html_article_links | html_list, json_ld, sitemap | — | 0 | https://www.fifa.com/feed<br/>https://www.fifa.com/rss<br/>https://www.fifa.com/rss.xml<br/>https://www.fifa.com/feed.xml<br/>https://www.fifa.com/football/rss<br/>https://www.fifa.com/soccer/rss<br/>https://www.fifa.com/world-cup/rss<br/>https://www.fifa.com/feed/ |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| AP News Soccer | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Al Jazeera Football | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| beIN SPORTS Football | media | html_list | og_meta, html_list, json_ld | html_list | 25 | https://www.beinsports.com/feed<br/>https://www.beinsports.com/rss<br/>https://www.beinsports.com/rss.xml<br/>https://www.beinsports.com/feed.xml<br/>https://www.beinsports.com/football/rss<br/>https://www.beinsports.com/soccer/rss<br/>https://www.beinsports.com/world-cup/rss<br/>https://www.beinsports.com/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| SuperSport Football | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| A Bola Futebol | media | html_list | og_meta, html_list, json_ld | html_list | 25 | https://www.abola.pt/rss-articles.xml<br/>https://www.abola.pt/feed<br/>https://www.abola.pt/rss<br/>https://www.abola.pt/rss.xml<br/>https://www.abola.pt/feed.xml<br/>https://www.abola.pt/football/rss<br/>https://www.abola.pt/soccer/rss<br/>https://www.abola.pt/world-cup/rss<br/>https://www.abola.pt/feed/ |  | ok | — | 已抓到有效条目，可继续优化相关性。 |
| Voetbal International Football | media | html_list | sitemap | — | 0 |  |  | partial | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |