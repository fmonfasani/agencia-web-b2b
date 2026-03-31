import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT / "scripts"

# extensiones consideradas scripts
SCRIPT_EXTENSIONS = [".py", ".sh", ".ps1", ".ts", ".js"]

# carpetas a ignorar
IGNORE_DIRS = ["node_modules", ".git", "scripts", "revisar", "dist", "build"]

SCRIPTS_DIR.mkdir(exist_ok=True)


def is_script(file: Path):
    return file.suffix in SCRIPT_EXTENSIONS


def should_ignore(path: Path):
    return any(part in IGNORE_DIRS for part in path.parts)


def move_script(file_path: Path):
    relative = file_path.relative_to(ROOT)

    # evitar mover cosas dentro de scripts
    if "scripts" in relative.parts:
        return None

    target = SCRIPTS_DIR / relative.name

    # evitar sobreescritura
    counter = 1
    while target.exists():
        target = SCRIPTS_DIR / f"{file_path.stem}_{counter}{file_path.suffix}"
        counter += 1

    shutil.move(str(file_path), str(target))
    return relative


def main():
    moved = []

    for root, dirs, files in os.walk(ROOT):
        root_path = Path(root)

        if should_ignore(root_path):
            continue

        for file in files:
            file_path = root_path / file

            try:
                if is_script(file_path):
                    result = move_script(file_path)
                    if result:
                        moved.append(str(result))
                        print(f"[MOVED] {result}")
            except Exception as e:
                print(f"[ERROR] {file_path}: {e}")

    print("\nResumen:")
    print(f"Total scripts movidos: {len(moved)}")


if __name__ == "__main__":
    main()