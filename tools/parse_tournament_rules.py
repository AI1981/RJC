#!/usr/bin/env python3
"""
Parse Tournament Rules (TR) from a plain text file into the app JSON format.

- Root rules (no dot in ref, e.g. "204") -> heading populated, text optional.
  If "Title: body" is present, heading=Title and text=body.
- Child rules (e.g. "204.4.a") -> heading empty/null, everything goes to text.
- Non-matching lines are treated as continuation of previous rule's text.

Usage:
  python3 tools/parse_tournament_rules.py sources/tr.txt assets/data/documents/tr.json \
    --version-label "draft-import-2025-12-31" --published-date "2025-12-31"
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


RULE_RE = re.compile(r"^\s*([0-9]{1,3}(?:\.[0-9a-z]+)*)\.\s*(.*)\s*$", re.IGNORECASE)


def is_root(ref: str) -> bool:
    return "." not in ref


def base_macro_id(ref: str) -> str:
    # Macro is the hundreds bucket (100/200/...) based on the integer part before any dots
    n = int(ref.split(".", 1)[0])
    return f"{(n // 100) * 100:03d}"


def normalize_space(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def split_title_body(rest: str) -> Tuple[str, str]:
    # Prefer splitting "Title: body" only once
    if ":" in rest:
        h, t = rest.split(":", 1)
        h = normalize_space(h)
        t = normalize_space(t)
        return (h or normalize_space(rest), t)
    return (normalize_space(rest), "")


def flush_entry(
    out: List[Dict[str, Any]],
    doc_id: str,
    ref: str,
    heading: Optional[str],
    text: str,
    macro_id: str,
    macro_title: str,
) -> None:
    text = normalize_space(text)

    entry = {
        "key": f"{doc_id} {ref}",
        "ref": ref,
        "heading": heading if heading else None,
        "text": text,
        # Keep path consistent with your frontend (string list)
        "path": [f"{macro_id} {macro_title}".strip()],
    }
    out.append(entry)


def parse_tr_text(text: str) -> List[Dict[str, Any]]:
    entries: List[Dict[str, Any]] = []

    current_ref: Optional[str] = None
    current_heading: Optional[str] = None
    current_text_parts: List[str] = []
    current_macro_id: str = "100"
    current_macro_title: str = "Introduction"

    # Track macro titles from macro roots if available (e.g. "200. Definitions")
    macro_titles: Dict[str, str] = {
        "100": "Introduction",
        "200": "Definitions",
        "300": "Eligibility",
        "400": "Policies",
        "500": "Communication",
        "600": "Competition Formats",
        "700": "Enforcement and Penalties",
    }

    def flush_current():
        nonlocal current_ref, current_heading, current_text_parts, current_macro_id, current_macro_title
        if not current_ref:
            return
        flush_entry(
            entries,
            doc_id="TR",
            ref=current_ref,
            heading=current_heading,
            text=" ".join(current_text_parts),
            macro_id=current_macro_id,
            macro_title=current_macro_title,
        )
        current_ref = None
        current_heading = None
        current_text_parts = []

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            continue

        m = RULE_RE.match(line)
        if m:
            # New rule starts -> flush previous
            flush_current()

            ref = m.group(1).strip().rstrip(".")
            rest = m.group(2).strip()

            # Determine macro bucket/title
            macro_id = base_macro_id(ref)
            macro_title = macro_titles.get(macro_id, f"Section {macro_id}")

            if is_root(ref):
                # Root rule: populate heading (optionally split "Title: body")
                h, t = split_title_body(rest)

                current_ref = ref
                current_heading = h if h else None
                current_text_parts = [t] if t else []

                # If it's also a macro root (100/200/...), update macro title from heading
                # Example: "200. Definitions"
                if ref.endswith("00"):
                    if h:
                        macro_titles[macro_id] = h
                        macro_title = h

            else:
                # Child rule: heading should be empty/null; all goes into text
                current_ref = ref
                current_heading = None
                current_text_parts = [rest] if rest else []

            current_macro_id = macro_id
            current_macro_title = macro_title
        else:
            # Continuation line -> append to current rule text
            if current_ref is None:
                # If the file has leading text before first rule, ignore it
                continue
            current_text_parts.append(line.strip())

    flush_current()

    # Sort by reference (numeric/alpha aware)
    def ref_key(r: str):
        parts = r.split(".")
        key = []
        for p in parts:
            if p.isdigit():
                key.append((0, int(p), ""))
            else:
                key.append((1, 0, p.lower()))
        return key

    entries.sort(key=lambda e: ref_key(e["ref"]))
    return entries


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("input_txt", type=Path)
    ap.add_argument("output_json", type=Path)
    ap.add_argument("--version-label", default=None)
    ap.add_argument("--published-date", default=None)
    ap.add_argument("--title", default="Riftbound Tournament Rules")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--source-name", default="User-provided official extract")
    ap.add_argument("--source-url", default="")
    args = ap.parse_args()

    today = date.today().isoformat()
    version_label = args.version_label or f"draft-import-{today}"
    published_date = args.published_date or today

    raw = args.input_txt.read_text(encoding="utf-8", errors="replace")
    entries = parse_tr_text(raw)

    doc = {
        "doc_id": "TR",
        "title": args.title,
        "lang": args.lang,
        "version_label": version_label,
        "published_date": published_date,
        "source_name": args.source_name,
        "source_url": args.source_url,
        "entries": entries,
    }

    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {args.output_json} with {len(entries)} entries.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())