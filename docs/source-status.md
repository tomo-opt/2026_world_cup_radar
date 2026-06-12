# 数据源状态（内部调试）

此文档用于记录最近一次抓取结果，不在前台默认展示。

| 来源 | 状态 | 抓取模式 | 尝试策略 | 有效条目 | 失败分类 | 下一步 |
| --- | --- | --- | --- | ---: | --- | --- |
| FIFA World Cup 2026 Official Match Schedule Article | manual_export_supported | manual_reference | page_reference | 1 | — | 已抓到有效条目，可继续优化相关性。 |
| FIFA World Cup 2026 Scores & Fixtures | partial | fixture | page_reference | 1 | — | 已抓到有效条目，可继续优化相关性。 |
| Sky Sports FIFA World Cup Scores & Fixtures | partial | fixture | page_reference | 1 | — | 已抓到有效条目，可继续优化相关性。 |
| ESPN 2026 FIFA World Cup Match Schedule | manual_export_supported | manual_reference | page_reference | 1 | — | 已抓到有效条目，可继续优化相关性。 |
| Google Trends Sports - United States | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - United Kingdom | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Canada | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Mexico | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Brazil | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Argentina | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Spain | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - France | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Germany | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Italy | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Japan | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - South Korea | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| ESPN Soccer | partial | html_list | html_list, json_ld, sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| ESPN Soccer Worldcup Page | partial | html_list | html_list, json_ld, sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| ESPN Soccer RSS Feeds Info Page | manual_export_supported | manual_reference | page_reference | 1 | — | 已抓到有效条目，可继续优化相关性。 |
| BBC Sport Football Worldcup Page | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| BBC Sport Football | error | rss | rss_direct | 0 | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| The Guardian Football Worldcup 2026 Page | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| The Guardian Football | error | rss | rss_direct | 0 | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Sky Sports Football | ok | html_list | og_meta, html_list, json_ld | 25 | — | 已抓到有效条目，可继续优化相关性。 |
| Sky Sports Football News Page | ok | html_list | og_meta, html_list, json_ld | 16 | — | 已抓到有效条目，可继续优化相关性。 |
| Reuters Soccer | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| ESPN Deportes Fútbol | partial | html_list | html_list, json_ld, sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| ESPN Deportes Fútbol Mundial | partial | html_list | html_list, json_ld, sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| AS Fútbol | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| AS Fútbol Mundial 2026 | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Marca Fútbol | ok | html_list | og_meta, html_list, json_ld | 25 | — | 已抓到有效条目，可继续优化相关性。 |
| Marca Fútbol Noticias | ok | html_list | og_meta, html_list, json_ld | 25 | — | 已抓到有效条目，可继续优化相关性。 |
| L'Équipe Football | ok | html_list | og_meta, html_list, json_ld | 25 | — | 已抓到有效条目，可继续优化相关性。 |
| L'Équipe Football Coupe du Monde | ok | html_list | og_meta, html_list, json_ld | 25 | — | 已抓到有效条目，可继续优化相关性。 |
| Kicker Fußball | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Globo Esporte Futebol | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Globo Esporte Futebol Copa do Mundo | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Olé Argentina Mundial 2026 Page | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Reddit r/soccer | error | rss | rss_direct | 0 | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Reddit r/football | error | rss | rss_direct | 0 | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Reddit r/worldcup | error | rss | rss_direct | 0 | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Mastodon hashtag #WorldCup | error | rss | rss_direct | 0 | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Mastodon hashtag #FIFAWorldCup | error | rss | rss_direct | 0 | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Mastodon hashtag #WorldCup2026 | error | rss | rss_direct | 0 | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Mastodon hashtag #football | error | rss | rss_direct | 0 | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Mastodon hashtag #soccer | error | rss | rss_direct | 0 | timeout_or_connection | 建议后续补充备用网址、降低页面深度或改用已发现 feed。 |
| Daily Mail Football Page | ok | html_list | og_meta, html_list, json_ld | 25 | — | 已抓到有效条目，可继续优化相关性。 |
| Daily Mail World Cup Page | ok | html_list | og_meta, html_list, json_ld | 25 | — | 已抓到有效条目，可继续优化相关性。 |
| Four Four Two News | ok | html_list | og_meta, html_list, json_ld | 24 | — | 已抓到有效条目，可继续优化相关性。 |
| Transfermarkt News | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| The Sun World Cup Page | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Yahoo Sport World Cup Page | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| One Football World Cup Page | ok | html_list | og_meta, html_list, json_ld, wp_json | 13 | — | 已抓到有效条目，可继续优化相关性。 |
| Sports Illustrated World Cup Page | ok | html_list | og_meta, html_list, json_ld | 25 | — | 已抓到有效条目，可继续优化相关性。 |
| NBC Sports World Cup Page | ok | html_list | og_meta, html_list, json_ld | 14 | — | 已抓到有效条目，可继续优化相关性。 |
| Goal World Cup News Page | ok | html_list | og_meta, html_list, json_ld | 25 | — | 已抓到有效条目，可继续优化相关性。 |
| Fox Sports World Cup News Page | ok | html_list | og_meta, html_list, json_ld, wp_json | 25 | — | 已抓到有效条目，可继续优化相关性。 |
| CBS Sports World Cup News Page | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Google Trends Sports - Australia | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - New Zealand | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Portugal | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Netherlands | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Uruguay | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Colombia | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Ecuador | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Paraguay | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Morocco | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Senegal | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Ghana | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Egypt | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Algeria | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Tunisia | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - South Africa | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Saudi Arabia | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Qatar | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Iran | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Iraq | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Jordan | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Türkiye | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Switzerland | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Belgium | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Croatia | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Sweden | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Norway | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Austria | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Czechia | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Bosnia and Herzegovina | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Panama | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Haiti | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Cape Verde | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Curaçao | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Ivory Coast | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - DR Congo | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| Google Trends Sports - Uzbekistan | test_pending | trend_test | page_reference | 1 | trends_test_pending | 作为实验源保留，等待后续手动导出或稳定方案。 |
| FIFA World Cup 2026 Teams | partial | html_list | html_list, json_ld, sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| FIFA Qualified Teams for World Cup 2026 | partial | html_article_links | html_list, json_ld, sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| AP News Soccer | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| Al Jazeera Football | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| beIN SPORTS Football | ok | html_list | og_meta, html_list, json_ld | 25 | — | 已抓到有效条目，可继续优化相关性。 |
| SuperSport Football | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |
| A Bola Futebol | ok | html_list | og_meta, html_list, json_ld | 25 | — | 已抓到有效条目，可继续优化相关性。 |
| Voetbal International Football | partial | html_list | sitemap | 0 | html_parse_no_items | 建议补充站点专用 selector、JSON-LD 或 sitemap 规则。 |