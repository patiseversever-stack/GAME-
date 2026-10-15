# Meshy 3D görev oluşturucu/izleyici. Kullanım: meshy_3d.py <jobs.json> <out_dir>
import base64, json, os, subprocess, sys, time
BASE = "https://api.meshy.ai/openapi/v1/"
KEY = os.environ["MESHY_API_KEY"]
def curl(args):
    return subprocess.run(["curl", "-sS", "-H", f"Authorization: Bearer {KEY}"] + args, capture_output=True, text=True).stdout
def main(jobs_path, out):
    os.makedirs(out, exist_ok=True)
    sp = os.path.join(out, "tasks.json")
    tasks = json.load(open(sp)) if os.path.exists(sp) else {}
    for j in json.load(open(jobs_path)):
        if j["id"] in tasks: continue
        body = dict(j["body"])
        if "image_file" in j:
            body["image_url"] = "data:image/png;base64," + base64.b64encode(open(j["image_file"], "rb").read()).decode()
        bf = os.path.join(out, j["id"] + ".body.json"); json.dump(body, open(bf, "w"))
        r = curl(["-X", "POST", BASE + j["endpoint"], "-H", "Content-Type: application/json", "-d", "@" + bf])
        os.remove(bf)
        try: tasks[j["id"]] = {"tid": json.loads(r)["result"], "ep": j["endpoint"]}
        except Exception: print("OLUŞTURMA HATASI", j["id"], r[:300]); continue
        json.dump(tasks, open(sp, "w"), indent=1); print("oluşturuldu", j["id"], flush=True)
    pending = {k: v for k, v in tasks.items() if not os.path.exists(os.path.join(out, k + ".json"))}
    t0 = time.time()
    while pending and time.time() - t0 < 1500:
        time.sleep(15)
        for k, t in list(pending.items()):
            d = json.loads(curl([BASE + t["ep"] + "/" + t["tid"]]) or "{}")
            st = d.get("status")
            if st == "SUCCEEDED":
                json.dump(d, open(os.path.join(out, k + ".json"), "w"), indent=1)
                for fmt, u in (d.get("model_urls") or {}).items():
                    if u and fmt == "glb": subprocess.run(["curl", "-sS", "-o", os.path.join(out, k + ".glb"), u])
                if d.get("thumbnail_url"): subprocess.run(["curl", "-sS", "-o", os.path.join(out, k + "_thumb.png"), d["thumbnail_url"]])
                print("bitti", k, flush=True); del pending[k]
            elif st in ("FAILED", "CANCELED", "EXPIRED"):
                print("BAŞARISIZ", k, d.get("task_error"), flush=True); del pending[k]
            else:
                print(k, st, d.get("progress"), flush=True)
    print("bekleyen:", list(pending))
main(sys.argv[1], sys.argv[2])
