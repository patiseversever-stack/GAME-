"""Meshy ile toplu görsel üretimi (text-to-image).

Anahtar istekte yazılmaz: bulut ortamının ağ gizli anahtarı api.meshy.ai
isteklerine Authorization başlığını kendisi ekler.

Kullanım: python3 ada/tools/meshy_img.py <işler.json> <çıktı klasörü>
işler.json: [{"id": "...", "model": "nano-banana-pro", "aspect": "16:9", "prompt": "..."}]
"""
import json, os, subprocess, sys, time

BASE = "https://api.meshy.ai/openapi/v1/"


def curl(args):
    r = subprocess.run(["curl", "-sS", "--max-time", "60"] + args, capture_output=True, text=True)
    return r.stdout


def balance():
    try:
        return json.loads(curl([BASE + "balance"]))["balance"]
    except Exception:
        return None


def main(jobs_path, out_dir):
    jobs = json.load(open(jobs_path, encoding="utf-8"))
    os.makedirs(out_dir, exist_ok=True)
    state_path = os.path.join(out_dir, "gorevler.json")
    tasks = json.load(open(state_path)) if os.path.exists(state_path) else {}
    start_balance = balance()
    print("başlangıç bakiyesi:", start_balance, flush=True)
    for j in jobs:
        if j["id"] in tasks:
            continue
        body = {"ai_model": j["model"], "prompt": j["prompt"]}
        if j.get("aspect"):
            body["aspect_ratio"] = j["aspect"]
        out = curl(["-X", "POST", BASE + "text-to-image", "-H", "Content-Type: application/json", "-d", json.dumps(body)])
        try:
            tasks[j["id"]] = json.loads(out)["result"]
        except Exception:
            print("OLUŞTURMA HATASI", j["id"], out[:300], flush=True)
            continue
        json.dump(tasks, open(state_path, "w"), indent=1)
        print("oluşturuldu", j["id"], flush=True)
    pending = dict(tasks)
    t0 = time.time()
    while pending and time.time() - t0 < 900:
        time.sleep(8)
        for jid, tid in list(pending.items()):
            d = json.loads(curl([BASE + "text-to-image/" + tid]) or "{}")
            st = d.get("status")
            if st == "SUCCEEDED":
                for i, u in enumerate(d.get("image_urls", [])):
                    ext = ".png" if ".png" in u.split("?")[0] else ".jpg"
                    name = f"{jid}{'' if i == 0 else '_' + str(i)}{ext}"
                    subprocess.run(["curl", "-sS", "--max-time", "120", "-o", os.path.join(out_dir, name), u])
                    print("indirildi", name, flush=True)
                del pending[jid]
            elif st in ("FAILED", "CANCELED", "EXPIRED"):
                print("BAŞARISIZ", jid, json.dumps(d.get("task_error", d))[:300], flush=True)
                del pending[jid]
    end_balance = balance()
    print("bitiş bakiyesi:", end_balance, flush=True)
    if start_balance is not None and end_balance is not None:
        print("harcanan:", start_balance - end_balance, flush=True)
    if pending:
        print("BEKLEYEN:", list(pending), flush=True)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
