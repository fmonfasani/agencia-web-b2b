import json
import argparse
import re
import subprocess
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path


MEMORY_PATH = Path("benchmarks/router_memory.json")
OLLAMA_BASE_URL = "http://127.0.0.1:11434"
EMBEDDING_MODEL_NAME = "nomic-embed-text"
MIN_SIMILARITY = 0.35
MIN_VECTOR_SIMILARITY = 0.72

STOPWORDS = {
    "a",
    "al",
    "algo",
    "como",
    "con",
    "de",
    "del",
    "el",
    "en",
    "es",
    "esta",
    "este",
    "esto",
    "la",
    "las",
    "lo",
    "los",
    "me",
    "mi",
    "para",
    "por",
    "que",
    "se",
    "su",
    "te",
    "un",
    "una",
    "y",
    "yo",
}

MODEL_PREFERENCES = {
    "codigo_simple": ["qwen2.5-coder:1.5b", "qwen2.5-coder:0.5b", "qwen2.5-coder:3b"],
    "codigo_complejo": ["qwen2.5-coder:3b", "qwen2.5:7b", "qwen2.5-coder:14b"],
    "general_simple": ["qwen2.5-coder:0.5b", "qwen2.5-coder:1.5b", "qwen2.5:7b"],
    "logica_compleja": ["qwen2.5:7b", "qwen2.5-coder:3b", "qwen2.5-coder:14b"],
    "razonamiento_largo": ["qwen2.5-coder:14b", "qwen2.5:14b", "qwen2.5:7b"],
    "humor": ["qwen2.5:7b", "qwen2.5-coder:3b", "qwen2.5-coder:1.5b"],
}


def now_iso():
    return datetime.now().isoformat(timespec="seconds")


def tokenize(text):
    words = re.findall(r"[a-z0-9áéíóúñü]+", text.lower())
    return [w for w in words if len(w) > 1 and w not in STOPWORDS]


def jaccard(a_tokens, b_tokens):
    a, b = set(a_tokens), set(b_tokens)
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def l2_norm(v):
    return (sum(x * x for x in v)) ** 0.5


def cosine_similarity(a, b):
    if not a or not b:
        return 0.0
    if len(a) != len(b):
        return 0.0
    na = l2_norm(a)
    nb = l2_norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return dot(a, b) / (na * nb)


def get_all_models():
    out = subprocess.check_output(["ollama", "list"], text=True, encoding="utf-8")
    lines = out.strip().splitlines()[1:]
    return [line.split()[0] for line in lines if line.strip()]


def get_routing_models(all_models):
    return {
        m for m in all_models if "embed" not in m.lower() and ":cloud" not in m.lower()
    }


def find_embedding_model(all_models):
    if EMBEDDING_MODEL_NAME in all_models:
        return EMBEDDING_MODEL_NAME
    for m in all_models:
        if m.startswith(f"{EMBEDDING_MODEL_NAME}:"):
            return m
    return None


def pick_first_installed(preferred_list, installed):
    for model in preferred_list:
        if model in installed:
            return model
    return None


def heuristic_route(question):
    q = question.lower()
    tokens = tokenize(question)
    long_question = len(tokens) >= 22

    coding_kw = {
        "codigo",
        "funcion",
        "python",
        "javascript",
        "typescript",
        "api",
        "sql",
        "bug",
        "refactor",
        "algoritmo",
    }
    complex_kw = {
        "arquitectura",
        "optimizar",
        "escalar",
        "concurrencia",
        "seguridad",
        "distribuido",
        "tradeoff",
        "comparar",
        "analiza",
    }
    logic_kw = {"logica", "demuestra", "infiere", "razona", "proposicion", "premisa"}
    humor_kw = {"chiste", "humor", "gracioso", "broma", "meme"}

    has_coding = any(k in q for k in coding_kw)
    has_complex = any(k in q for k in complex_kw)
    has_logic = any(k in q for k in logic_kw)
    has_humor = any(k in q for k in humor_kw)

    if has_humor:
        return "humor"
    if long_question or ("paso a paso" in q) or ("razonamiento" in q):
        return "razonamiento_largo"
    if has_logic:
        return "logica_compleja"
    if has_coding and has_complex:
        return "codigo_complejo"
    if has_coding:
        return "codigo_simple"
    if has_complex:
        return "logica_compleja"
    return "general_simple"


def load_memory():
    if not MEMORY_PATH.exists():
        return {"version": 2, "interactions": [], "model_token_counts": {}}
    with MEMORY_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    data.setdefault("version", 2)
    data.setdefault("interactions", [])
    data.setdefault("model_token_counts", {})
    return data


def save_memory(memory):
    MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    with MEMORY_PATH.open("w", encoding="utf-8") as f:
        json.dump(memory, f, ensure_ascii=False, indent=2)


def ollama_embed(text, embedding_model):
    if not embedding_model:
        return None
    payload = {"model": embedding_model, "input": text}
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}

    urls = [f"{OLLAMA_BASE_URL}/api/embed", f"{OLLAMA_BASE_URL}/api/embeddings"]
    for url in urls:
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = json.loads(resp.read().decode("utf-8"))
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
            continue

        if "embeddings" in body and body["embeddings"]:
            return body["embeddings"][0]
        if "embedding" in body and body["embedding"]:
            return body["embedding"]
    return None


def memory_suggestion(question, q_vec, memory, installed):
    q_tokens = tokenize(question)
    metrics = {"vector_best_sim": 0.0, "token_best_sim": 0.0, "token_score_best": 0.0}

    if q_vec is not None:
        best_vec = {"model": None, "sim": 0.0}
        for row in memory.get("interactions", []):
            model = row.get("final_model")
            row_vec = row.get("embedding")
            if model not in installed or row_vec is None:
                continue
            sim = cosine_similarity(q_vec, row_vec)
            if sim > best_vec["sim"]:
                best_vec = {"model": model, "sim": sim}
        metrics["vector_best_sim"] = best_vec["sim"]
        if best_vec["model"] and best_vec["sim"] >= MIN_VECTOR_SIMILARITY:
            return best_vec["model"], f"memoria_vector={best_vec['sim']:.2f}", metrics

    best = {"model": None, "sim": 0.0}
    for row in memory.get("interactions", []):
        model = row.get("final_model")
        if model not in installed:
            continue
        sim = jaccard(q_tokens, row.get("tokens", []))
        if sim > best["sim"]:
            best = {"model": model, "sim": sim}
    metrics["token_best_sim"] = best["sim"]

    token_scores = defaultdict(float)
    token_counts = memory.get("model_token_counts", {})
    for model, counts in token_counts.items():
        if model not in installed:
            continue
        total = sum(counts.values()) or 1
        for token in q_tokens:
            token_scores[model] += counts.get(token, 0) / total

    token_model = None
    token_val = 0.0
    if token_scores:
        token_model, token_val = max(token_scores.items(), key=lambda kv: kv[1])
    metrics["token_score_best"] = token_val

    if best["model"] and best["sim"] >= MIN_SIMILARITY:
        return best["model"], f"memoria_similaridad={best['sim']:.2f}", metrics
    if token_model and token_val > 0.12:
        return token_model, f"memoria_tokens={token_val:.2f}", metrics
    return None, "sin_match_memoria", metrics


def choose_model(question, q_vec, installed, memory):
    mem_model, mem_reason, mem_metrics = memory_suggestion(question, q_vec, memory, installed)
    if mem_model:
        return mem_model, f"ruta_por_memoria ({mem_reason})", mem_metrics

    route = heuristic_route(question)
    model = pick_first_installed(MODEL_PREFERENCES[route], installed)
    if model:
        return model, f"ruta_heuristica={route}", mem_metrics

    if installed:
        fallback = sorted(installed)[0]
        return fallback, "fallback_primer_modelo_disponible", mem_metrics
    return None, "sin_modelos_disponibles", mem_metrics


def run_ollama(model, prompt):
    p = subprocess.run(
        ["ollama", "run", model, prompt],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return p.returncode, (p.stdout or "").strip(), (p.stderr or "").strip()


def update_learning(memory, question, question_embedding, selected_model, final_model, accepted):
    tokens = tokenize(question)
    memory["interactions"].append(
        {
            "timestamp": now_iso(),
            "question": question,
            "tokens": tokens,
            "embedding": question_embedding,
            "selected_model": selected_model,
            "final_model": final_model,
            "accepted": accepted,
        }
    )

    token_counts = memory.setdefault("model_token_counts", {})
    model_counts = token_counts.setdefault(final_model, {})
    weight = 2 if accepted else 1
    for t in tokens:
        model_counts[t] = model_counts.get(t, 0) + weight


def ask_yes_no(msg, default="s"):
    raw = input(msg).strip().lower()
    if not raw:
        return default == "s"
    return raw.startswith("s")


def parse_args():
    parser = argparse.ArgumentParser(description="Router Ollama con memoria y embeddings opcionales.")
    parser.add_argument(
        "--embedding",
        choices=["auto", "on", "off"],
        default="auto",
        help="Activa embeddings: auto (usa nomic si existe), on (exige embedding), off (desactiva).",
    )
    parser.add_argument(
        "--debug-metrics",
        action="store_true",
        help="Muestra metricas de decision (similitud vector/token).",
    )
    return parser.parse_args()


def interactive_loop():
    args = parse_args()
    all_models = get_all_models()
    installed = get_routing_models(all_models)
    embedding_model = find_embedding_model(all_models)

    if args.embedding == "off":
        embedding_model = None
    elif args.embedding == "on" and not embedding_model:
        print("ERROR: --embedding on requiere tener instalado nomic-embed-text.")
        return

    memory = load_memory()

    print("Router LLM con memoria listo.")
    print(f"Modelos de inferencia detectados: {sorted(installed)}")
    if embedding_model:
        print(f"Vectorizacion activa con: {embedding_model}")
    else:
        print("Vectorizacion no activa (instala nomic-embed-text para habilitarla).")
    print("Escribi tu pregunta. Comando para salir: /exit\n")

    while True:
        question = input("Tu pregunta > ").strip()
        if not question:
            continue
        if question.lower() in {"/exit", "exit", "salir", "quit"}:
            save_memory(memory)
            print("Memoria guardada. Hasta luego.")
            break

        q_vec = ollama_embed(question, embedding_model) if embedding_model else None
        model, reason, decision_metrics = choose_model(question, q_vec, installed, memory)
        if not model:
            print("No hay modelos disponibles en Ollama.")
            continue

        print(f"\nModelo elegido: {model} ({reason})")
        if args.debug_metrics:
            print(
                "Metricas: "
                f"vector_best_sim={decision_metrics['vector_best_sim']:.3f} | "
                f"token_best_sim={decision_metrics['token_best_sim']:.3f} | "
                f"token_score_best={decision_metrics['token_score_best']:.3f}"
            )
        code, out, err = run_ollama(model, question)
        if code == 0:
            print("\nRespuesta:\n")
            print(out)
        else:
            print("\nError al ejecutar el modelo.")
            if err:
                print(err[:300])

        accepted = ask_yes_no("\nLa ruta elegida fue correcta? [S/n]: ", default="s")
        final_model = model

        if not accepted:
            alt = input("Indica modelo correcto (enter para mantener actual): ").strip()
            if alt:
                if alt in installed:
                    final_model = alt
                else:
                    print("Ese modelo no esta instalado. Se mantiene el elegido.")

        update_learning(memory, question, q_vec, model, final_model, accepted)
        save_memory(memory)
        print("Memoria actualizada.\n")


if __name__ == "__main__":
    interactive_loop()
