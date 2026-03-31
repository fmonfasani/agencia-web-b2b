# benchmark_ollama.py
import csv
import re
import subprocess
import time
from datetime import datetime
from pathlib import Path

TASKS = [
    {
        "categoria": "simple_coding",
        "pregunta": "Escribi una funcion en Python que invierta una cadena.",
        "modelos": ["qwen2.5-coder:0.5b", "qwen2.5-coder:1.5b"],
    },
    {
        "categoria": "simple_general",
        "pregunta": "Explica brevemente que es la computacion en la nube.",
        "modelos": ["qwen2.5-coder:0.5b", "qwen2.5-coder:1.5b"],
    },
    {
        "categoria": "compleja_logica",
        "pregunta": "Si todos los A son B y algunos B son C, se puede afirmar que algunos A son C?",
        "modelos": ["qwen2.5-coder:3b", "qwen2.5:7b"],
    },
    {
        "categoria": "compleja_humor",
        "pregunta": "Conta un chiste corto sobre programadores y explica por que da risa.",
        "modelos": ["qwen2.5-coder:3b", "qwen2.5:7b"],
    },
    {
        "categoria": "razonamiento_largo",
        "pregunta": "Compara ventajas y desventajas de trabajo remoto vs presencial en 10 puntos, con conclusion.",
        "modelos": ["qwen2.5-coder:14b", "qwen2.5:14b"],
    },
]
RUNS_PER_PROMPT = 1
OUTPUT_DIR = Path("benchmarks")
ANSI_RE = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]|\x1B[@-_]")


def get_models():
    out = subprocess.check_output(["ollama", "list"], text=True, encoding="utf-8")
    lines = out.strip().splitlines()[1:]  # skip header
    models = [line.split()[0] for line in lines if line.strip()]
    # opcional: excluir embeddings y cloud
    models = [m for m in models if "embed" not in m and ":cloud" not in m]
    return models


def run_once(model, prompt):
    t0 = time.perf_counter()
    p = subprocess.run(
        ["ollama", "run", model, prompt],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    dt = time.perf_counter() - t0
    ok = p.returncode == 0
    return dt, ok, p.returncode, (p.stdout or "").strip(), (p.stderr or "").strip()


def strip_ansi(text):
    return ANSI_RE.sub("", text)


def ensure_output_dir():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def timestamp_slug():
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def write_detail_csv(rows, path):
    fieldnames = [
        "run_id",
        "timestamp",
        "modelo",
        "categoria_tarea",
        "cantidad_tareas",
        "pregunta_idx",
        "pregunta",
        "iteracion",
        "tiempo_respuesta_s",
        "ok",
        "codigo_salida",
        "respuesta_preview",
        "stderr_preview",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


def write_summary_csv(rows, path):
    fieldnames = [
        "run_id",
        "timestamp",
        "modelo",
        "categoria_tarea",
        "cantidad_tareas",
        "pregunta_idx",
        "pregunta",
        "corridas_ok",
        "corridas_error",
        "avg_s",
        "p50_s",
        "p95_s",
        "min_s",
        "max_s",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


def percentile(sorted_values, p):
    if not sorted_values:
        return None
    if p <= 0:
        return sorted_values[0]
    if p >= 100:
        return sorted_values[-1]

    rank = (len(sorted_values) - 1) * (p / 100.0)
    low = int(rank)
    high = min(low + 1, len(sorted_values) - 1)
    weight = rank - low
    return sorted_values[low] + (sorted_values[high] - sorted_values[low]) * weight


def main():
    ensure_output_dir()
    run_id = timestamp_slug()
    run_timestamp = datetime.now().isoformat(timespec="seconds")

    available_models = set(get_models())
    print(f"Modelos detectados: {sorted(available_models)}\n")

    detail_rows = []
    summary_rows = []
    skipped = []

    for prompt_idx, task in enumerate(TASKS, start=1):
        category = task["categoria"]
        prompt = task["pregunta"]
        target_models = task["modelos"]

        for model in target_models:
            if model not in available_models:
                skipped.append((category, model))
                print(f"{model:25} {category:18} q#{prompt_idx} SKIP (modelo no instalado)")
                continue

            times = []
            ok_count = 0
            err_count = 0
            last_out = ""

            for i in range(1, RUNS_PER_PROMPT + 1):
                dt, ok, returncode, out, err = run_once(model, prompt)
                if ok:
                    times.append(dt)
                    ok_count += 1
                    last_out = out
                else:
                    err_count += 1

                clean_out = strip_ansi(out)
                clean_err = strip_ansi(err)
                detail_rows.append(
                    {
                        "run_id": run_id,
                        "timestamp": run_timestamp,
                        "modelo": model,
                        "categoria_tarea": category,
                        "cantidad_tareas": len(TASKS),
                        "pregunta_idx": prompt_idx,
                        "pregunta": prompt,
                        "iteracion": i,
                        "tiempo_respuesta_s": f"{dt:.4f}",
                        "ok": ok,
                        "codigo_salida": returncode,
                        "respuesta_preview": clean_out[:120],
                        "stderr_preview": clean_err[:120],
                    }
                )

            if times:
                avg = sum(times) / len(times)
                min_s = min(times)
                max_s = max(times)
                sorted_times = sorted(times)
                p50 = percentile(sorted_times, 50)
                p95 = percentile(sorted_times, 95)
                print(
                    f"{model:25} {category:18} q#{prompt_idx} avg={avg:.2f}s p50={p50:.2f}s p95={p95:.2f}s "
                    f"min={min_s:.2f}s max={max_s:.2f}s "
                    f"ok={ok_count}/{RUNS_PER_PROMPT} | '{strip_ansi(last_out)[:60]}'"
                )
            else:
                avg = p50 = p95 = min_s = max_s = None
                print(f"{model:25} {category:18} q#{prompt_idx} ERROR (0 corridas exitosas)")

            summary_rows.append(
                {
                    "run_id": run_id,
                    "timestamp": run_timestamp,
                    "modelo": model,
                    "categoria_tarea": category,
                    "cantidad_tareas": len(TASKS),
                    "pregunta_idx": prompt_idx,
                    "pregunta": prompt,
                    "corridas_ok": ok_count,
                    "corridas_error": err_count,
                    "avg_s": f"{avg:.4f}" if avg is not None else "",
                    "p50_s": f"{p50:.4f}" if p50 is not None else "",
                    "p95_s": f"{p95:.4f}" if p95 is not None else "",
                    "min_s": f"{min_s:.4f}" if min_s is not None else "",
                    "max_s": f"{max_s:.4f}" if max_s is not None else "",
                }
            )

    detail_path = OUTPUT_DIR / f"benchmark_detalle_{run_id}.csv"
    summary_path = OUTPUT_DIR / f"benchmark_resumen_{run_id}.csv"
    write_detail_csv(detail_rows, detail_path)
    write_summary_csv(summary_rows, summary_path)

    print("\nCSV generados:")
    print(f"- {detail_path}")
    print(f"- {summary_path}")
    if skipped:
        print(f"\nModelos omitidos por no estar instalados: {len(skipped)}")


if __name__ == "__main__":
    main()
