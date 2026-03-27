import os
import shutil
from datetime import datetime

BASE_PATH = r"D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b"
MEMORY_PATH = os.path.join(BASE_PATH, ".claude", "agent-memory")
MEMORY_FILE = os.path.join(MEMORY_PATH, "MEMORY_PROJECT.md")
HISTORY_PATH = os.path.join(MEMORY_PATH, "history")
LATEST_FILE = os.path.join(MEMORY_PATH, "LATEST.md")
DIFF_FILE = os.path.join(MEMORY_PATH, "last_diff.md")


def run_architecture_agent():
    print("Running architecture-agent...")
    os.system(f'cd /d "{BASE_PATH}" && claude run architecture-agent')


def version_memory():
    if not os.path.exists(MEMORY_FILE):
        print("No MEMORY_PROJECT.md found")
        return None

    os.makedirs(HISTORY_PATH, exist_ok=True)

    today = datetime.now().strftime("%Y-%m-%d")
    version_file = os.path.join(HISTORY_PATH, f"{today}.md")

    shutil.copy(MEMORY_FILE, version_file)
    shutil.copy(MEMORY_FILE, LATEST_FILE)

    print(f"Memory versioned: {version_file}")
    return version_file


def compute_diff(prev_file, current_file):
    if not prev_file or not os.path.exists(prev_file):
        return

    with open(prev_file, "r", encoding="utf-8") as f:
        old = f.readlines()

    with open(current_file, "r", encoding="utf-8") as f:
        new = f.readlines()

    import difflib

    diff = difflib.unified_diff(old, new, lineterm="")

    with open(DIFF_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(diff))

    print("Diff generated")


def get_last_version():
    if not os.path.exists(HISTORY_PATH):
        return None

    files = sorted(os.listdir(HISTORY_PATH))
    if len(files) < 2:
        return None

    return os.path.join(HISTORY_PATH, files[-2])


def run():
    print("=== DAILY ARCHITECTURE RUN ===")

    prev_version = get_last_version()

    run_architecture_agent()

    current_version = version_memory()

    compute_diff(prev_version, current_version)

    print("=== DONE ===")


if __name__ == "__main__":
    run()