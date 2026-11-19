"""Extract the supplied KOSEN announcements into a reviewable static dataset.

Usage: python scripts/extract_jobs.py path/to/announcements.zip
The PDF files are read locally and are never copied to the deployable site.
"""

import argparse
import json
import re
import unicodedata
import zipfile
from pathlib import Path

import fitz


THAI_PUA = {
    **{0xF700: 0x0E10, 0xF70F: 0x0E0D},
    **dict(zip(range(0xF701, 0xF705), range(0x0E34, 0x0E38))),
    **dict(zip(range(0xF705, 0xF70A), range(0x0E48, 0x0E4D))),
    **dict(zip(range(0xF70A, 0xF70F), range(0x0E48, 0x0E4D))),
    0xF710: 0x0E31,
    0xF711: 0x0E4D,
    0xF712: 0x0E47,
    **dict(zip(range(0xF713, 0xF718), range(0x0E48, 0x0E4D))),
    0xF718: 0x0E38,
    0xF719: 0x0E39,
    0xF71A: 0x0E3A,
}


def clean(value):
    value = value.translate(THAI_PUA)
    value = unicodedata.normalize("NFC", value)
    return re.sub(r"\s+", " ", value).strip(" -\u2013\u2014\n\t")


def between(text, start, end):
    match = re.search(start + r"\s*:?\s*(.*?)\s*(?=" + end + r")", text, re.I | re.S)
    return clean(match.group(1)) if match else ""


def field(text, start, end):
    return between(text, re.escape(start) + r"\s*:", re.escape(end) + r"\s*:")


def parse_job_text(text, source_file):
    match = re.search(r"IL-ESA26-\d{4}", source_file)
    if not match:
        raise ValueError(f"Missing offer ID: {source_file}")
    job_id = match.group(0)
    text = unicodedata.normalize("NFKC", text.translate(THAI_PUA))
    company = field(text, "Company name", "Work Location")
    location = field(text, "Work Location", "Position")
    title = field(text, "Position", "Job Description")
    if not (company and location and title):
        raise ValueError(f"Missing core field: {job_id}")

    major_block = field(text, "Applicable major", "Knowledge and skill requirements")
    majors = []
    if re.search(r"☑\s*Mechtronics Engineering", major_block, re.I):
        majors.append("Mechatronics Engineering")
    if re.search(r"☑\s*Computer Engineering", major_block, re.I):
        majors.append("Computer Engineering")

    salary_text = between(text, r"Basic salary\s*:", r"Bonus\b")
    base_match = re.match(r"(?:THB|฿)?\s*(\d{2,3}(?:,\d{3})+)", salary_text, re.I)
    if not base_match:
        base_match = re.match(r"First\s+\d+\s+days\s+of\s+start\s*:\s*(\d{2,3}(?:,\d{3})+)", salary_text, re.I)
    total_match = re.search(r"total monthly income[^\d]{0,45}(\d{2,3}(?:,\d{3})+)", salary_text, re.I)
    salary_base = int(base_match.group(1).replace(",", "")) if base_match else None
    total_is_qualified = bool(total_match and (
        re.search(r"(?:~|≈|approximately|about|around|start\s+from|from\s+|at\s+least)", total_match.group(0), re.I)
        or re.match(r"\s*(?:[-–—~]|\+\+|to\s+\d)", salary_text[total_match.end():], re.I)
    ))
    salary_total = int(total_match.group(1).replace(",", "")) if total_match and not total_is_qualified else None

    closed = between(text, r"Position closed", r"Company name\s*:")
    disclosed = between(text, r"Disclosed to students", r"Position closed")
    return {
        "id": job_id,
        "company": company,
        "title": title,
        "applicationType": "recommendation" if source_file.startswith("School Recommendation") else "open",
        "locationText": location,
        "majorText": ", ".join(majors) if majors else "ไม่ระบุในช่องสาขา",
        "description": field(text, "Job Description", "Number of positions"),
        "skillsText": field(text, "Knowledge and skill requirements", "Workdays and times"),
        "workdaysText": field(text, "Workdays and times", "Type of employment"),
        "employmentType": field(text, "Type of employment", "Benefits"),
        "salaryText": salary_text,
        "salaryBase": salary_base,
        "salaryTotal": salary_total,
        "allowanceText": field(text, "Allowance", "Language Allowance"),
        "benefitsText": between(text, r"Bene(?:fi|ﬁ)ts\s*:", r"Document require"),
        "closedText": closed,
        "disclosedText": disclosed,
        "sourceFile": source_file,
        "reviewedAt": "2026-11-19",
    }


def extract_jobs(zip_path):
    jobs = []
    with zipfile.ZipFile(zip_path) as archive:
        for name in archive.namelist():
            if "IL-ESA26-" not in name or not name.lower().endswith(".pdf"):
                continue
            document = fitz.open(stream=archive.read(name), filetype="pdf")
            text = "\n".join(page.get_text() for page in document)
            jobs.append(parse_job_text(text, name))
    return sorted(jobs, key=lambda job: job["id"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("zip_path", type=Path)
    parser.add_argument("--output", type=Path, default=Path("src/data/jobs.json"))
    args = parser.parse_args()
    jobs = extract_jobs(args.zip_path)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(jobs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(jobs)} offers to {args.output}")


if __name__ == "__main__":
    main()
