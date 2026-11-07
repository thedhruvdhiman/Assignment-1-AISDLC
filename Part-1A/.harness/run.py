#!/usr/bin/env python3
"""Run repository-native quality gates and create auditable evidence."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / ".harness" / "config.json"
EVIDENCE = ROOT / "evidence"


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_config() -> dict[str, Any]:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def tracked_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "."],
        cwd=ROOT,
        capture_output=True,
        check=True,
    )
    paths = []
    for raw_path in result.stdout.split(b"\0"):
        if not raw_path:
            continue
        path = ROOT / os.fsdecode(raw_path)
        if path.is_file():
            paths.append(path)
    return paths


def source_manifest(snapshot_name: str, config: dict[str, Any]) -> dict[str, Any]:
    files: list[dict[str, str]] = []
    for source in config["source_paths"]:
        source_path = ROOT / source
        if not source_path.is_dir():
            raise RuntimeError(f"Snapshot source directory does not exist: {source}")
        for path in sorted(source_path.rglob("*")):
            if not path.is_file():
                continue
            relative = path.relative_to(ROOT).as_posix()
            content = path.read_bytes()
            files.append({"path": relative, "sha256": sha256(content)})
    commit = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    return {
        "snapshot": snapshot_name,
        "captured_at": now(),
        "base_commit": commit.stdout.strip() if commit.returncode == 0 else None,
        "sources": list(config["source_paths"]),
        "files": files,
    }


def snapshot(snapshot_name: str, config: dict[str, Any]) -> None:
    if snapshot_name not in {"initial-generation", "final-generation"}:
        raise ValueError("Snapshot name must be initial-generation or final-generation.")
    target = EVIDENCE / snapshot_name
    if target.exists():
        raise FileExistsError(f"Snapshot already exists; refusing to overwrite: {target}")
    target.mkdir(parents=True)
    for source in config["source_paths"]:
        source_path = ROOT / source
        destination = target / source
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil_copytree(source_path, destination)
    manifest = source_manifest(snapshot_name, config)
    manifest_bytes = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode()
    (target / "manifest.json").write_bytes(manifest_bytes)
    (target / "manifest.sha256").write_text(
        f"{sha256(manifest_bytes)}  manifest.json\n",
        encoding="utf-8",
    )
    print(f"Snapshot created: evidence/{snapshot_name}")
    print(f"Source files hashed: {len(manifest['files'])}")
    print(f"Manifest SHA-256: {sha256(manifest_bytes)}")


def shutil_copytree(source: Path, destination: Path) -> None:
    import shutil

    shutil.copytree(source, destination, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))


def test_files(config: dict[str, Any]) -> list[Path]:
    found: set[Path] = set()
    for pattern in config["test_globs"]:
        found.update(path for path in ROOT.glob(pattern) if path.is_file())
    return sorted(found)


def initialize_integrity_lock(config: dict[str, Any]) -> None:
    files = test_files(config)
    if not files:
        raise RuntimeError("No test files matched configured test_globs.")
    lock_path = ROOT / config["test_lock"]
    if lock_path.exists():
        raise FileExistsError(f"Integrity lock already exists: {lock_path}")
    lock = {
        "created_at": now(),
        "files": {
            path.relative_to(ROOT).as_posix(): sha256(path.read_bytes())
            for path in files
        },
    }
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_path.write_text(json.dumps(lock, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Integrity lock created: {lock_path.relative_to(ROOT)}")
    print(f"Test files locked: {len(files)}")


def check_integrity(config: dict[str, Any]) -> list[str]:
    lock_path = ROOT / config["test_lock"]
    if not lock_path.is_file():
        return [f"Test integrity lock is missing: {config['test_lock']}"]
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    expected = lock.get("files", {})
    actual_paths = test_files(config)
    actual = {
        path.relative_to(ROOT).as_posix(): sha256(path.read_bytes())
        for path in actual_paths
    }
    errors = []
    for path in sorted(set(expected) - set(actual)):
        errors.append(f"Locked test file is missing: {path}")
    for path in sorted(set(actual) - set(expected)):
        errors.append(f"Test file was added after the integrity lock: {path}")
    for path in sorted(set(expected) & set(actual)):
        if expected[path] != actual[path]:
            errors.append(f"Locked test file changed: {path}")
    return errors


def verify_history_chain() -> list[str]:
    history = EVIDENCE / "harness-runs.jsonl"
    if not history.exists():
        return []
    errors = []
    previous = ""
    for line_number, line in enumerate(history.read_text(encoding="utf-8").splitlines(), 1):
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            errors.append(f"Run history line {line_number} is not valid JSON.")
            continue
        recorded_hash = record.pop("hash", None)
        if record.get("previous_hash", "") != previous:
            errors.append(f"Run history line {line_number} has an invalid previous_hash.")
        expected_hash = sha256(
            (previous + json.dumps(record, sort_keys=True, separators=(",", ":"))).encode()
        )
        if recorded_hash != expected_hash:
            errors.append(f"Run history line {line_number} failed its hash check.")
        previous = recorded_hash or ""
    return errors


def run_command(command: list[str], timeout: int = 900) -> dict[str, Any]:
    started = now()
    try:
        result = subprocess.run(
            command,
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        output = result.stdout
        if result.stderr:
            output += ("\n" if output else "") + result.stderr
        return {
            "status": "PASS" if result.returncode == 0 else "FAIL",
            "command": command,
            "started_at": started,
            "completed_at": now(),
            "exit_code": result.returncode,
            "output": output,
        }
    except (OSError, subprocess.TimeoutExpired) as error:
        return {
            "status": "FAIL",
            "command": command,
            "started_at": started,
            "completed_at": now(),
            "exit_code": None,
            "output": str(error),
        }


SECRET_PATTERNS = [
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"),
    re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    re.compile(
        r"(?i)\b(?:api[_-]?key|secret[_-]?key|access[_-]?token)\b"
        r"\s*[:=]\s*['\"]?[A-Za-z0-9/+_=-]{24,}"
    ),
]


def scan_secrets(config: dict[str, Any]) -> list[str]:
    exclusions = tuple(config.get("secrets_scan_excludes", []))
    findings = []
    for path in tracked_files():
        relative = path.relative_to(ROOT).as_posix()
        if relative.startswith(exclusions):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for line_number, line in enumerate(text.splitlines(), 1):
            if any(pattern.search(line) for pattern in SECRET_PATTERNS):
                findings.append(f"Potential secret pattern at {relative}:{line_number}")
    return findings


def traceability_errors(config: dict[str, Any]) -> list[str]:
    spec_path = ROOT / config["spec"]
    mapping_path = ROOT / config["traceability"]
    if not spec_path.is_file():
        return [f"Feature specification not found: {config['spec']}"]
    if not mapping_path.is_file():
        return [f"Traceability map not found: {config['traceability']}"]
    spec = spec_path.read_text(encoding="utf-8")
    requirement_ids = set(re.findall(r"\bFR-\d{3}\b", spec))
    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    mapped_ids = set(mapping)
    errors = [
        f"Requirement has no test mapping: {requirement}"
        for requirement in sorted(requirement_ids - mapped_ids)
    ]
    errors.extend(
        f"Traceability map contains an unknown requirement: {requirement}"
        for requirement in sorted(mapped_ids - requirement_ids)
    )
    for requirement in sorted(requirement_ids & mapped_ids):
        checks = mapping[requirement]
        if not checks:
            errors.append(f"{requirement} has an empty test mapping.")
            continue
        for check in checks:
            test_path = ROOT / check["path"]
            if not test_path.is_file():
                errors.append(f"{requirement} test file is missing: {check['path']}")
                continue
            contents = test_path.read_text(encoding="utf-8")
            if check["test"].casefold() not in contents.casefold():
                errors.append(
                    f"{requirement} test selector not found in {check['path']}: {check['test']}"
                )
    return errors


def jest_junit(jest_json_path: Path) -> ET.Element:
    root = ET.Element("testsuites")
    if not jest_json_path.is_file():
        suite = ET.SubElement(root, "testsuite", name="Jest", tests="1", failures="1")
        case = ET.SubElement(suite, "testcase", classname="Jest", name="Jest JSON report")
        ET.SubElement(case, "error", message="Jest did not produce its JSON report.")
        return root
    try:
        report = json.loads(jest_json_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        suite = ET.SubElement(root, "testsuite", name="Jest", tests="1", failures="1")
        case = ET.SubElement(suite, "testcase", classname="Jest", name="Jest JSON report")
        ET.SubElement(case, "error", message=str(error))
        return root
    for result in report.get("testResults", []):
        assertions = result.get("assertionResults", [])
        failures = sum(assertion.get("status") == "failed" for assertion in assertions)
        skipped = sum(assertion.get("status") in {"pending", "skipped", "todo"} for assertion in assertions)
        suite = ET.SubElement(
            root,
            "testsuite",
            name=result.get("name", "Jest"),
            tests=str(len(assertions)),
            failures=str(failures),
            skipped=str(skipped),
            errors="0",
        )
        for assertion in assertions:
            case = ET.SubElement(
                suite,
                "testcase",
                classname=result.get("name", "Jest"),
                name=assertion.get("fullName") or assertion.get("title", "test"),
            )
            status = assertion.get("status")
            if status == "failed":
                failure = ET.SubElement(case, "failure", message="; ".join(assertion.get("failureMessages", [])))
                failure.text = "\n".join(assertion.get("failureMessages", []))
            elif status in {"pending", "skipped", "todo"}:
                ET.SubElement(case, "skipped")
    return root


def build_junit_report(jest_json_path: Path, vitest_xml_path: Path, destination: Path) -> None:
    combined = jest_junit(jest_json_path)
    if vitest_xml_path.is_file():
        try:
            vitest_root = ET.parse(vitest_xml_path).getroot()
            suites = list(vitest_root) if vitest_root.tag == "testsuites" else [vitest_root]
            for suite in suites:
                combined.append(copy.deepcopy(suite))
        except ET.ParseError as error:
            suite = ET.SubElement(combined, "testsuite", name="Vitest", tests="1", failures="1")
            case = ET.SubElement(suite, "testcase", classname="Vitest", name="JUnit report")
            ET.SubElement(case, "error", message=str(error))
    else:
        suite = ET.SubElement(combined, "testsuite", name="Vitest", tests="1", failures="1")
        case = ET.SubElement(suite, "testcase", classname="Vitest", name="JUnit report")
        ET.SubElement(case, "error", message="Vitest did not produce its JUnit report.")
    all_suites = list(combined)
    combined.set("tests", str(sum(int(suite.get("tests", "0")) for suite in all_suites)))
    combined.set("failures", str(sum(int(suite.get("failures", "0")) for suite in all_suites)))
    combined.set("errors", str(sum(int(suite.get("errors", "0")) for suite in all_suites)))
    combined.set("skipped", str(sum(int(suite.get("skipped", "0")) for suite in all_suites)))
    destination.parent.mkdir(parents=True, exist_ok=True)
    ET.indent(combined, space="  ")
    ET.ElementTree(combined).write(destination, encoding="utf-8", xml_declaration=True)


def next_run_number() -> int:
    results = EVIDENCE / "harness-results"
    numbers = []
    for path in results.glob("run-*.json") if results.exists() else []:
        match = re.fullmatch(r"run-(\d{3,})\.json", path.name)
        if match:
            numbers.append(int(match.group(1)))
    return max(numbers, default=0) + 1


def make_feedback(run_id: str, failed: dict[str, Any]) -> None:
    destination = EVIDENCE / "feedback" / f"{run_id}-feedback.md"
    destination.parent.mkdir(parents=True, exist_ok=True)
    sections = [
        f"# Automated feedback for {run_id}",
        "",
        f"Generated: {now()}",
        "",
        "This file was generated by `.harness/run.py` after a failing gate.",
        "",
    ]
    for name, result in failed.items():
        sections.extend(
            [
                f"## {name}",
                "",
                f"- Status: {result['status']}",
                f"- Command: `{' '.join(result.get('command', []))}`",
                f"- Exit code: `{result.get('exit_code')}`",
                "",
                "```text",
                result.get("output", "").rstrip(),
                "```",
                "",
            ]
        )
    destination.write_text("\n".join(sections), encoding="utf-8")


def append_history(run_id: str, timestamp: str, gates: dict[str, Any], overall: str) -> dict[str, Any]:
    history = EVIDENCE / "harness-runs.jsonl"
    previous = ""
    if history.exists():
        lines = history.read_text(encoding="utf-8").splitlines()
        if lines:
            previous = json.loads(lines[-1]).get("hash", "")
    record = {
        "run": run_id,
        "timestamp": timestamp,
        "overall": overall,
        "gates": {name: result["status"] for name, result in gates.items()},
        "previous_hash": previous,
    }
    record["hash"] = sha256(
        (previous + json.dumps(record, sort_keys=True, separators=(",", ":"))).encode()
    )
    history.parent.mkdir(parents=True, exist_ok=True)
    with history.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=True) + "\n")
    return record


def run_harness(config: dict[str, Any]) -> int:
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    number = next_run_number()
    run_id = f"run-{number:03d}"
    started = now()
    gates: dict[str, Any] = {}

    gates["Lint"] = run_command(["npm", "run", "lint"])
    gates["Security"] = run_command(["npm", "audit", "--omit=dev", "--json"])

    with tempfile.TemporaryDirectory(prefix="library-harness-") as temp_name:
        temp = Path(temp_name)
        jest_json = temp / "jest-results.json"
        vitest_xml = temp / "vitest-junit.xml"
        backend = run_command(
            [
                "npm",
                "run",
                "test",
                "-w",
                "backend",
                "--",
                "--json",
                f"--outputFile={jest_json}",
            ]
        )
        frontend = run_command(
            [
                "npm",
                "run",
                "test",
                "-w",
                "frontend",
                "--",
                "--reporter=junit",
                f"--outputFile={vitest_xml}",
            ]
        )
        junit_path = EVIDENCE / "pytest-junit.xml"
        build_junit_report(jest_json, vitest_xml, junit_path)
        test_output = (
            f"=== Backend Jest (exit {backend['exit_code']}) ===\n{backend['output']}\n"
            f"=== Frontend Vitest (exit {frontend['exit_code']}) ===\n{frontend['output']}\n"
            f"JUnit report: {junit_path.relative_to(ROOT)}"
        )
        gates["Unit and contract tests"] = {
            "status": "PASS" if backend["status"] == frontend["status"] == "PASS" else "FAIL",
            "command": backend["command"] + ["&&"] + frontend["command"],
            "started_at": backend["started_at"],
            "completed_at": frontend["completed_at"],
            "exit_code": 0 if backend["status"] == frontend["status"] == "PASS" else 1,
            "output": test_output,
            "subcommands": {"backend": backend, "frontend": frontend},
            "junit_report": junit_path.relative_to(ROOT).as_posix(),
        }

    integrity_errors = check_integrity(config) + verify_history_chain()
    gates["Integrity"] = {
        "status": "PASS" if not integrity_errors else "FAIL",
        "command": ["python3", ".harness/run.py", "--integrity-check"],
        "started_at": now(),
        "completed_at": now(),
        "exit_code": 0 if not integrity_errors else 1,
        "output": "\n".join(integrity_errors) if integrity_errors else "Test hashes and prior run-history chain verified.",
    }

    secret_findings = scan_secrets(config)
    gates["Secrets scan"] = {
        "status": "PASS" if not secret_findings else "FAIL",
        "command": ["python3", ".harness/run.py", "--secrets-scan"],
        "started_at": now(),
        "completed_at": now(),
        "exit_code": 0 if not secret_findings else 1,
        "output": "\n".join(secret_findings) if secret_findings else "No configured secret patterns found in non-ignored project files.",
    }

    trace_errors = traceability_errors(config)
    gates["Traceability"] = {
        "status": "PASS" if not trace_errors else "FAIL",
        "command": ["python3", ".harness/run.py", "--traceability-check"],
        "started_at": now(),
        "completed_at": now(),
        "exit_code": 0 if not trace_errors else 1,
        "output": "\n".join(trace_errors) if trace_errors else "Every functional requirement ID maps to an existing named test.",
    }

    failed = {name: result for name, result in gates.items() if result["status"] != "PASS"}
    overall = "PASS" if not failed else "FAIL"
    completed = now()
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    summary = append_history(run_id, started, gates, overall)
    record = {
        "run": run_id,
        "started_at": started,
        "completed_at": completed,
        "command": "python3 .harness/run.py",
        "overall": overall,
        "gates": gates,
        "history": summary,
        "notes": [
            "Lint uses ESLint for the repository's TypeScript/Vue code.",
            "Security gate audits production dependencies; full npm audit also covers development/test tools and was recorded in run-003.",
            "The compatibility-named pytest-junit.xml is a merged report generated from Jest and Vitest machine reports.",
        ],
    }
    results_dir = EVIDENCE / "harness-results"
    results_dir.mkdir(parents=True, exist_ok=True)
    (results_dir / f"{run_id}.json").write_text(
        json.dumps(record, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    if failed:
        make_feedback(run_id, failed)
    print(f"{run_id}: {overall}")
    for name, result in gates.items():
        print(f"  {name}: {result['status']}")
    if failed:
        print(f"Failure feedback: evidence/feedback/{run_id}-feedback.md")
    print(f"Machine result: evidence/harness-results/{run_id}.json")
    return 0 if overall == "PASS" else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--snapshot", choices=["initial-generation", "final-generation"])
    group.add_argument("--initialize-integrity-lock", action="store_true")
    group.add_argument("--integrity-check", action="store_true")
    group.add_argument("--secrets-scan", action="store_true")
    group.add_argument("--traceability-check", action="store_true")
    args = parser.parse_args()
    config = load_config()
    if args.snapshot:
        snapshot(args.snapshot, config)
        return 0
    if args.initialize_integrity_lock:
        initialize_integrity_lock(config)
        return 0
    if args.integrity_check:
        errors = check_integrity(config) + verify_history_chain()
    elif args.secrets_scan:
        errors = scan_secrets(config)
    elif args.traceability_check:
        errors = traceability_errors(config)
    else:
        return run_harness(config)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print("PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
