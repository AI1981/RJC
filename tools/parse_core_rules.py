#!/usr/bin/env python3
"""
tools/parse_core_rules.py

Generate the JSON document consumed by the webapp from a plain-text Core Rules file.

Expected input format (cr.txt):
- Rule headers start with a 3-digit number, optionally followed by dotted segments:
  000. Golden and Silver Rules
  103.1.b.2. Your deck’s Domain Identity is dictated by the domains of your Champion Legend.
  322.10.a. The Combat remains...

- Body text for a rule can span multiple lines until the next rule header.

Output format (core_rules.json) matches the current app pattern:
{
  "doc_id": "CR",
  "title": "Riftbound Core Rules",
  "lang": "en",
  "version_label": "...",
  "published_date": "YYYY-MM-DD",
  "source_name": "...",
  "source_url": "",
  "entries": [
    { "key": "CR-103.1.b.2", "ref": "103.1.b.2", "heading": "...", "path": [...], "text": "..." }
  ]
}
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional


# Matches:
# 000. Title...
# 103.1.b.2. Title...
# 322.10.a. Title...
RULE_RE = re.compile(
    r"^\s*"
    r"(?P<ref>[0-9]{3}(?:\.[0-9A-Za-z]+)*)"  # 3-digit root + optional dotted segments
    r"\.\s+"                                 # a dot + whitespace
    r"(?P<head>.*\S)\s*$"                    # heading text (non-empty)
)

# Also allow rare cases where the dot after ref is missing but followed by whitespace + heading:
RULE_RE_FALLBACK = re.compile(
    r"^\s*"
    r"(?P<ref>[0-9]{3}(?:\.[0-9A-Za-z]+)*)"
    r"\s+"
    r"(?P<head>.*\S)\s*$"
)

LAST_UPDATED_RE = re.compile(r"^\s*Last Updated:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*$", re.IGNORECASE)
TITLE_RE = re.compile(r"^\s*Riftbound Core Rules\s*$", re.IGNORECASE)


def parent_ref(ref: str) -> Optional[str]:
    return ref.rsplit(".", 1)[0] if "." in ref else None


def key_for(doc_id: str, ref: str) -> str:
    return f"{doc_id}-{ref}"


def build_path_pairs(ref: str, titles: Dict[str, str]) -> List[str]:
    """
    Returns a breadcrumb-like path as alternating [ref, title, ref, title, ...]
    Example: 103.1.b.2 -> ["103","To play Riftbound...", "103.1","1 Champion Legend", ..., "103.1.b.2","Heading"]
    """
    chain: List[str] = []
    cur = ref
    while True:
        chain.append(cur)
        p = parent_ref(cur)
        if not p:
            break
        cur = p
    chain.reverse()

    out: List[str] = []
    for r in chain:
        out.extend([r, titles.get(r, "")])
    return out


def squash_trailing_spaces(lines: List[str]) -> str:
    # Preserve line breaks, but trim line ends; keep blank lines as paragraph breaks.
    return "\n".join([ln.rstrip() for ln in lines]).strip()


@dataclass
class Entry:
    ref: str
    heading: str
    text_lines: List[str]

    def to_json(self, doc_id: str, titles: Dict[str, str]) -> Dict:
        ref_norm = self.ref.strip()
        is_root = "." not in ref_norm

        if is_root:
            heading = self.heading.strip()
            text_lines = self.text_lines
        else:
            # Subrules: do not populate heading; move the header sentence into text.
            heading = ""
            text_lines = [self.heading.strip()] + self.text_lines if self.heading.strip() else self.text_lines

        return {
            "key": key_for(doc_id, ref_norm),
            "ref": ref_norm,
            "heading": heading,
            "path": build_path_pairs(ref_norm, titles),
            "text": squash_trailing_spaces(text_lines),
        }


def parse_file(src: Path) -> tuple[str, str, List[Entry]]:
    """
    Returns (title, last_updated, entries)
    """
    raw_lines = src.read_text(encoding="utf-8", errors="ignore").splitlines()

    detected_title = "Riftbound Core Rules"
    detected_last_updated = ""

    # Scan header area for title + last updated
    for ln in raw_lines[:80]:
        if TITLE_RE.match(ln):
            detected_title = "Riftbound Core Rules"
        m = LAST_UPDATED_RE.match(ln)
        if m:
            detected_last_updated = m.group(1)

    entries: List[Entry] = []
    current: Optional[Entry] = None

    def flush():
        nonlocal current
        if current is not None:
            entries.append(current)
            current = None

    for ln in raw_lines:
        # Skip known header lines
        if TITLE_RE.match(ln) or LAST_UPDATED_RE.match(ln):
            continue

        m = RULE_RE.match(ln) or RULE_RE_FALLBACK.match(ln)
        if m:
            flush()
            ref = m.group("ref").strip().strip(".")
            head = m.group("head").strip()
            current = Entry(ref=ref, heading=head, text_lines=[])
            continue

        if current is None:
            continue

        # Keep body lines (including blank lines for paragraph separation)
        current.text_lines.append(ln)

    flush()
    return detected_title, detected_last_updated, entries


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="Path to cr.txt (plain text)")
    ap.add_argument("--out", required=True, help="Path to output JSON file (e.g., assets/data/documents/core_rules.json)")
    ap.add_argument("--doc-id", default="CR", help="Document id (default CR)")
    ap.add_argument("--title", default="", help="Override document title (default: detected from file)")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--published", default="", help="YYYY-MM-DD; if blank uses 'Last Updated' from file or today")
    ap.add_argument("--source-name", default="Official (imported from text file)")
    ap.add_argument("--source-url", default="")
    args = ap.parse_args()

    src = Path(args.src)
    out = Path(args.out)

    detected_title, detected_last_updated, parsed_entries = parse_file(src)

    published = args.published.strip() or detected_last_updated or date.today().isoformat()
    version_label = f"Last Updated: {detected_last_updated}" if detected_last_updated else f"import-{date.today().isoformat()}"
    title = args.title.strip() or detected_title

    # Build titles map for breadcrumbs (ref -> heading).
    # Only root rules have headings; subrules will intentionally have empty headings.
    titles: Dict[str, str] = {e.ref: e.heading for e in parsed_entries if "." not in e.ref}

    doc = {
        "doc_id": args.doc_id,
        "title": title,
        "lang": args.lang,
        "version_label": version_label,
        "published_date": published,
        "source_name": args.source_name,
        "source_url": args.source_url,
        "entries": [e.to_json(args.doc_id, titles) for e in parsed_entries],
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"OK: wrote {out} with {len(parsed_entries)} entries")
    if parsed_entries:
        print(f"First: {parsed_entries[0].ref} {parsed_entries[0].heading}")
        print(f"Last : {parsed_entries[-1].ref} {parsed_entries[-1].heading}")


if __name__ == "__main__":
    main()