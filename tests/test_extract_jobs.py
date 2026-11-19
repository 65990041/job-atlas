import json
import unittest
from collections import Counter
from pathlib import Path

from scripts.extract_jobs import parse_job_text


ROOT = Path(__file__).resolve().parents[1]


class ExtractJobsTests(unittest.TestCase):
    def test_separates_base_salary_from_total_income(self):
        text = """JOB ANNOUNCEMENT
Job offer No.
IL-ESA26-0001
Disclosed to students
25 September 2026
Position closed
1 May 2027
Company name: HBA (Thailand) Co., Ltd.
Work Location: Silom, Bangkok
Position: IT engineer or Programmer
Job Description: IT support services
Number of positions: 1 position
Applicable major: ☐ Mechtronics Engineering ☑ Computer Engineering
Knowledge and skill requirements: Database development
Workdays and times: 5 Days
Type of employment: Permanent
Benefits:
Basic salary: 20,000 THB (Total monthly income 22,000 THB)
Bonus: 2 months/year
Allowance: Transpiration 2,000 THB/month
Document require ☑:
"""
        job = parse_job_text(text, "School Recommendation Position Announcement/IL-ESA26-0001_HBA.pdf")
        self.assertEqual(job["id"], "IL-ESA26-0001")
        self.assertEqual(job["salaryBase"], 20000)
        self.assertEqual(job["salaryTotal"], 22000)
        self.assertEqual(job["applicationType"], "recommendation")
        self.assertEqual(job["majorText"], "Computer Engineering")

    def test_unknown_salary_stays_unknown(self):
        text = """Company name: Example
Work Location: Chonburi
Position: Engineer
Job Description: Testing
Number of positions: 1
Applicable major: ☑ Mechtronics Engineering ☐ Computer Engineering
Knowledge and skill requirements: -
Workdays and times: -
Type of employment: Permanent
Benefits:
Basic salary: ตามที่ตกลงกับบริษัท
Bonus: -
"""
        job = parse_job_text(text, "1st round Open Application/IL-ESA26-0005_Example.pdf")
        self.assertIsNone(job["salaryBase"])
        self.assertIsNone(job["salaryTotal"])
        self.assertEqual(job["salaryText"], "ตามที่ตกลงกับบริษัท")

    def test_employment_type_before_ligature_benefits_label(self):
        text = """Company name: Example
Work Location: Bangkok
Position: Engineer
Job Description: Testing
Number of positions: 1
Applicable major: ☑ Mechtronics Engineering ☐ Computer Engineering
Knowledge and skill requirements: -
Workdays and times: Monday to Friday
Type of employment: Permanent
Beneﬁts:
Basic salary: 20,000 THB
Bonus: -
"""
        job = parse_job_text(text, "1st round Open Application/IL-ESA26-0005_Example.pdf")
        self.assertEqual(job["employmentType"], "Permanent")

    def test_total_income_range_is_not_reported_as_exact_amount(self):
        text = """Company name: Example
Work Location: Chonburi
Position: Engineer
Job Description: Testing
Number of positions: 1
Applicable major: ☑ Mechtronics Engineering ☐ Computer Engineering
Knowledge and skill requirements: -
Workdays and times: -
Type of employment: Permanent
Benefits:
Basic salary: 18,000 THB (total monthly income 18,000 – 20,000 THB)
Bonus: -
"""
        job = parse_job_text(text, "1st round Open Application/IL-ESA26-0039_Example.pdf")
        self.assertEqual(job["salaryBase"], 18000)
        self.assertIsNone(job["salaryTotal"])
        self.assertIn("18,000 – 20,000", job["salaryText"])

    def test_salary_text_survives_bonus_label_without_colon(self):
        text = """Company name: Example
Work Location: Bangkok
Position: Engineer
Job Description: Testing
Number of positions: 1
Applicable major: ☑ Mechtronics Engineering ☐ Computer Engineering
Knowledge and skill requirements: -
Workdays and times: -
Type of employment: Permanent
Benefits:
Basic salary: under consideration
Bonus Frequency: 1 time/year
"""
        job = parse_job_text(text, "1st round Open Application/IL-ESA26-0034_Example.pdf")
        self.assertEqual(job["salaryText"], "under consideration")

    def test_qualified_total_income_is_not_exact(self):
        for salary in (
            "19,000 THB (total monthly income ~22,000 THB)",
            "19,000 THB (total monthly income Approximately THB 22,000 per month)",
            "18,000 THB (total monthly income start from 20,000 THB)",
            "25,000 THB/month (total monthly income THB35,000~40,000 THB)",
        ):
            with self.subTest(salary=salary):
                text = f"Company name: Example\nWork Location: Bangkok\nPosition: Engineer\nJob Description: Testing\nBasic salary: {salary}\nBonus: -"
                job = parse_job_text(text, "1st round Open Application/IL-ESA26-0050_Example.pdf")
                self.assertIsNone(job["salaryTotal"])
                self.assertEqual(job["salaryText"], salary)

    def test_starting_salary_before_first_ninety_days(self):
        text = "Company name: Example\nWork Location: Bangkok\nPosition: Engineer\nJob Description: Testing\nBasic salary: First 90 days of start: 21,000 THB/month, After the 90 days: 22,000 THB/month (Total monthly income 23,900 THB)\nBonus: -"
        job = parse_job_text(text, "1st round Open Application/IL-ESA26-0021_Example.pdf")
        self.assertEqual(job["salaryBase"], 21000)
        self.assertEqual(job["salaryTotal"], 23900)

    def test_generated_dataset_has_all_announcements(self):
        jobs = json.loads((ROOT / "src/data/jobs.json").read_text(encoding="utf-8"))
        self.assertEqual(len(jobs), 55)
        self.assertEqual(len({job["id"] for job in jobs}), 55)
        self.assertEqual(Counter(job["applicationType"] for job in jobs), Counter({"recommendation": 35, "open": 20}))
        for job in jobs:
            self.assertTrue(job["company"])
            self.assertTrue(job["title"])
            self.assertTrue(job["locationText"])
            self.assertTrue(job["sourceFile"].endswith(".pdf"))


if __name__ == "__main__":
    unittest.main()
