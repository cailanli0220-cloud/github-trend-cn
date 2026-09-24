import importlib.util
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch, Mock
import requests

spec = importlib.util.spec_from_file_location('scan', Path(__file__).resolve().parents[1] / 'scripts/scan.py')
scan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scan)
NOW = datetime(2026, 9, 24, 1, tzinfo=timezone.utc)

class ScannerTests(unittest.TestCase):
    def repo(self, stars=1000):
        return {'full_name': 'test/project', 'stargazers_count': stars, 'description': 'An agent framework',
                'topics': ['ai-agent'], 'language': 'Python', 'created_at': '2026-01-01T00:00:00Z'}

    def test_trending_missing_growth_is_unknown_not_zero(self):
        html = '<article class="Box-row"><h2><a href="/foo/bar">foo / bar</a></h2><span>1,234 stars today</span></article>'
        self.assertEqual(scan.parse_trending(html), {'foo/bar': 1234})
        self.assertEqual(scan.parse_trending(html.replace('1,234 stars today', '')), {'foo/bar': None})

    def test_snapshot_preserves_actual_interval_and_negative_delta(self):
        sample = [{'at': (NOW - timedelta(hours=48)).isoformat(), 'stars': 1200}]
        self.assertEqual(scan.snapshot_delta(sample, 1000, NOW), (-200, 48))
        self.assertEqual(scan.snapshot_delta([], 1000, NOW), (None, None))
        sample[0]['at'] = (NOW - timedelta(hours=2)).isoformat()
        self.assertEqual(scan.snapshot_delta(sample, 1000, NOW), (None, None))

    def test_old_large_repo_does_not_beat_actual_daily_growth(self):
        large = scan.build_item(self.repo(500000), {'sources': ['active-topic']}, {}, NOW)
        rising = scan.build_item(self.repo(), {'sources': ['trending'], 'today': 200}, {}, NOW)
        self.assertGreater(rising['score'], large['score'])

    def test_repeat_penalty_and_same_day_new_marker(self):
        signals = {'sources': ['trending'], 'today': 100}
        fresh = scan.build_item(self.repo(), signals, {}, NOW)
        repeat = scan.build_item(self.repo(), signals, {'featured_dates': ['2026-09-23']}, NOW)
        same_day = scan.build_item(self.repo(), signals, {'featured_dates': ['2026-09-24']}, NOW)
        self.assertGreater(fresh['score'], repeat['score'])
        self.assertFalse(repeat['is_new'])
        self.assertTrue(same_day['is_new'])

    def test_absent_key_and_api_outage_keep_basic_chinese(self):
        item = scan.build_item(self.repo(), {'sources': ['trending']}, {}, NOW)
        with patch.dict(os.environ, {'DEEPSEEK_API_KEY': ''}):
            self.assertEqual(scan.enrich_chinese([item]), 'basic')
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true', 'DEEPSEEK_API_KEY': 'test-only-placeholder'}), patch.object(scan, 'github', side_effect=requests.ConnectionError()), patch.object(scan.HTTP, 'post', side_effect=requests.Timeout()):
            self.assertEqual(scan.enrich_chinese([item]), 'basic')
        self.assertIn('中文', item['summary_source'])

    def test_local_run_never_calls_deepseek(self):
        with patch.dict(os.environ, {'GITHUB_ACTIONS': '', 'DEEPSEEK_API_KEY': 'test-only-placeholder'}), patch.object(scan.HTTP, 'post') as post:
            self.assertEqual(scan.enrich_chinese([]), 'basic')
            post.assert_not_called()

    def test_secret_redaction(self):
        with patch.dict(os.environ, {'DEEPSEEK_API_KEY': 'private-test-string'}):
            self.assertNotIn('private-test-string', scan.safe_text('text private-test-string'))

    def test_practical_selection_is_bounded_diverse_and_documented(self):
        catalog = scan.read_json(scan.ROOT / 'data/guides.json', {})
        items = []
        for name in catalog:
            r = self.repo()
            r['full_name'] = name
            items.append(scan.build_item(r, {'sources': ['practical-library']}, {}, NOW))
        unverified = scan.build_item(self.repo(9000000), {'sources': ['trending'], 'today': 10000}, {}, NOW)
        chosen, library = scan.practical_selection(items + [unverified], {}, NOW, catalog)
        self.assertEqual(len(chosen), 5)
        self.assertEqual(len(library), len(catalog))
        self.assertEqual({p['category'] for p in chosen}, {'办公自动化', '内容创作', '编程开发'})
        self.assertNotIn('test/project', {p['name'] for p in chosen})
        self.assertTrue(all('未安装实测' in p['summary_source'] for p in library))
        few, _ = scan.practical_selection(items[:2], {}, NOW, catalog)
        self.assertEqual(len(few), 2)

    def test_practical_repeat_penalty_and_invalid_guide(self):
        catalog = scan.read_json(scan.ROOT / 'data/guides.json', {})
        name = next(iter(catalog))
        r = self.repo()
        r['full_name'] = name
        item = scan.build_item(r, {'sources': []}, {}, NOW)
        fresh, _ = scan.practical_selection([item], {}, NOW, catalog)
        old, _ = scan.practical_selection([item], {name: {'practical_dates': ['2026-09-23']}}, NOW, catalog)
        self.assertGreater(fresh[0]['practical_score'], old[0]['practical_score'])
        self.assertFalse(old[0]['is_new'])
        self.assertFalse(scan.valid_guide({'category': '办公自动化', 'task': 'invented'}))

    def test_malformed_ai_guide_response_falls_back(self):
        import base64
        item = scan.build_item(self.repo(), {'sources': []}, {}, NOW)
        readme = {'content': base64.b64encode(b'public README ' * 40).decode()}
        response = Mock()
        response.json.return_value = {'choices': [{'message': {'content': '[]'}}]}
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true', 'DEEPSEEK_API_KEY': 'test-only-placeholder'}), patch.object(scan, 'github', return_value=readme), patch.object(scan.HTTP, 'post', return_value=response):
            self.assertEqual(scan.discover_guides([item], {}, NOW), {})

    def test_total_source_outage_preserves_last_successful_timestamp(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(scan, 'DATA', Path(tmp)), patch.object(scan, 'trending', side_effect=requests.ConnectionError()), patch.object(scan, 'github', side_effect=requests.ConnectionError()), patch.object(scan.time, 'sleep'):
            previous = {'updated_at': '2026-09-23T01:00:00+00:00', 'projects': [{'name': 'test/project'}]}
            scan.save_json(Path(tmp) / 'trending.json', previous)
            scan.scan()
            result = scan.read_json(Path(tmp) / 'trending.json', {})
            self.assertEqual(result['updated_at'], previous['updated_at'])
            self.assertEqual(result['projects'], previous['projects'])
            self.assertEqual(result['status'], 'stale')

    def test_empty_initial_scan_fails_instead_of_publishing_blank(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(scan, 'DATA', Path(tmp)), patch.object(scan, 'trending', side_effect=requests.ConnectionError()), patch.object(scan, 'github', side_effect=requests.ConnectionError()), patch.object(scan.time, 'sleep'):
            with self.assertRaises(RuntimeError):
                scan.scan()

if __name__ == '__main__':
    unittest.main()
