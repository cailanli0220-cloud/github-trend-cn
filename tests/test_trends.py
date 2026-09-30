from test_scan import scan, NOW
import test_scan
from datetime import timedelta
import unittest

class TrendTests(unittest.TestCase):
    def item(self, heat, samples=(), **extra):
        hist = {'samples': list(samples), **extra}
        return scan.build_item(test_scan.ScannerTests().repo(), {'sources': ['trending'], 'today': heat}, hist, NOW)

    def sample(self, days, heat, stars=900, rank=30):
        return {'at': (NOW-timedelta(days=days)).isoformat(), 'stars': stars, 'heat': heat, 'rank': rank}

    def test_acceleration_and_repeat_filter(self):
        p=self.item(40,[self.sample(1,20)],featured_dates=['2026-09-23'])
        self.assertEqual(p['status'],'accelerating')
        self.assertTrue(p['eligible'])
        self.assertFalse(self.item(21,[self.sample(1,20)],featured_dates=['2026-09-23'])['eligible'])

    def test_warming_missing_history_and_same_day(self):
        self.assertEqual(self.item(30,[self.sample(2,20),self.sample(1,25)])['status'],'warming')
        self.assertEqual(self.item(100,[self.sample(1,None)])['status'],'watching')
        self.assertEqual(self.item(100,[self.sample(0,10)])['status'],'new')

    def test_quotas_and_no_duplicates(self):
        items=[]
        for i in range(40):
            p=self.item(30)
            p.update(name=f'owner/p{i}', is_ai=i<25)
            items.append(p)
        chosen=scan.select_daily(items)
        self.assertEqual(len(chosen),20)
        self.assertEqual(sum(p['lane']=='AI 优先' for p in chosen),15)
        self.assertEqual(len({p['name'] for p in chosen}),20)

    def test_category_coverage_and_token_boundaries(self):
        for topic,cat in [('coding-agent','Coding Agent'),('mcp','MCP'),('ollama','本地模型'),('text-to-speech','语音/视频'),('rag','RAG/Memory'),('ai-agent','Agent'),('llm','AI 应用')]:
            self.assertEqual(scan.category({'topics':[topic]}),cat)
        self.assertEqual(scan.category({'description':'mail repair tool'}),'其他开源')

    def test_different_heat_sources_do_not_claim_acceleration(self):
        old = self.sample(1, 5)
        old['heat_source'] = 'snapshot'
        p = self.item(100, [old])
        self.assertEqual(p['status'], 'watching')
        self.assertIsNone(p['heat_change'])

    def test_old_samples_do_not_support_seven_day_claims(self):
        p = self.item(100, [self.sample(8, 1)])
        self.assertIsNone(p['window_star_delta'])
        self.assertIsNone(p['previous_heat'])
