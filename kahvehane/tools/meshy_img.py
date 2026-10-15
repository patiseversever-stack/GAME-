# Meshy text-to-image toplu üretici. Anahtar MESHY_API_KEY ortam değişkeninden okunur.
import json, os, subprocess, sys, time
BASE = "https://api.meshy.ai/openapi/v1/"
KEY = os.environ["MESHY_API_KEY"]

def curl(args):
    r = subprocess.run(["curl", "-sS", "-H", f"Authorization: Bearer {KEY}"] + args,
                       capture_output=True, text=True)
    return r.stdout

def main(jobs_path, out_dir):
    jobs = json.load(open(jobs_path, encoding="utf-8"))
    os.makedirs(out_dir, exist_ok=True)
    state_path = os.path.join(out_dir, "tasks.json")
    tasks = json.load(open(state_path)) if os.path.exists(state_path) else {}
    for j in jobs:
        if j["id"] in tasks:
            continue
        ep = j.get("endpoint", "text-to-image")
        body = {"ai_model": j["model"], "prompt": j["prompt"], "generate_multi_view": j.get("multi_view", False)}
        if j.get("aspect"): body["aspect_ratio"] = j["aspect"]
        if j.get("input_task_id"): body["input_task_id"] = j["input_task_id"]
        out = curl(["-X", "POST", BASE + ep, "-H", "Content-Type: application/json", "-d", json.dumps(body)])
        try:
            tasks[j["id"]] = {"tid": json.loads(out)["result"], "ep": ep}
        except Exception:
            print("OLUŞTURMA HATASI", j["id"], out[:300]); continue
        json.dump(tasks, open(state_path, "w"), indent=1)
        print("oluşturuldu", j["id"], tasks[j["id"]], flush=True)
    pending = dict(tasks)
    t0 = time.time()
    while pending and time.time() - t0 < 600:
        time.sleep(8)
        for jid, t in list(pending.items()):
            d = json.loads(curl([BASE + t["ep"] + "/" + t["tid"]]) or "{}")
            st = d.get("status")
            if st == "SUCCEEDED":
                for i, u in enumerate(d.get("image_urls", [])):
                    ext = ".png" if ".png" in u.split("?")[0] else ".jpg"
                    subprocess.run(["curl", "-sS", "-o", os.path.join(out_dir, f"{jid}{'' if i == 0 else '_' + str(i)}{ext}"), u])
                print("bitti", jid, flush=True); del pending[jid]
            elif st in ("FAILED", "CANCELED", "EXPIRED"):
                print("BAŞARISIZ", jid, d.get("task_error"), flush=True); del pending[jid]
    print("bekleyen:", list(pending))

main(sys.argv[1], sys.argv[2])
