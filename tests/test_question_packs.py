import csv
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_questions', ROOT / 'scripts/build_questions.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class QuestionPackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.day = self.root / '2026-10-01'
        self.day.mkdir()
        self.manifest = {'id': self.day.name, 'label': '1 Oct 2026', 'questions': [
            {'prompt': f'Question {i}', 'csv': f'{i}.csv'} for i in range(7)
        ]}
        (self.day / 'day.json').write_text(json.dumps(self.manifest), encoding='utf-8')
        for i in range(7):
            self.write_rows(f'{i}.csv', [['Answer|Alias', 'A comma, a "quote"\nand another line.', 10]])

    def write_rows(self, name, rows):
        with (self.day / name).open('w', encoding='utf-8-sig', newline='') as handle:
            writer = csv.writer(handle)
            writer.writerow(['ANSWER', 'Blurb', 'Worth'])
            writer.writerows(rows)

    def test_csv_round_trip(self):
        answer = builder.load_packs(self.root)[0]['questions'][0]['answers'][0]
        self.assertEqual(answer['forms'], ['Answer', 'Alias'])
        self.assertEqual(answer['note'], 'A comma, a "quote"\nand another line.')
        self.assertEqual(answer['points'], 10)

    def test_invalid_tier(self):
        self.write_rows('0.csv', [['Answer', '', 99]])
        with self.assertRaisesRegex(ValueError, 'Worth must be one of'):
            builder.load_packs(self.root)

    def test_duplicate_alias(self):
        self.write_rows('0.csv', [['Answer|Alias', '', 10], ['Other|ALIAS', '', 30]])
        with self.assertRaisesRegex(ValueError, 'duplicate answer/alias'):
            builder.load_packs(self.root)

    def test_missing_question(self):
        self.manifest['questions'].pop()
        (self.day / 'day.json').write_text(json.dumps(self.manifest), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'seven questions'):
            builder.load_packs(self.root)

    def test_existing_packs(self):
        self.assertGreaterEqual(len(builder.load_packs(ROOT / 'question-packs')), 2)


if __name__ == '__main__':
    unittest.main()
