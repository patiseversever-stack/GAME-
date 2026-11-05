"""Meshy ile oynanabilir karakter hattı: görsel -> 3D -> iskelet -> animasyonlar.

Anahtar istekte yazılmaz: bulut ortamının ağ gizli anahtarı api.meshy.ai
isteklerine Authorization başlığını kendisi ekler.

Kullanım:
  python3 ada/tools/meshy_karakter.py <referans.png> <çıktı klasörü> <boy_metre> <anim_id:ad> ...
Örnek:
  python3 ada/tools/meshy_karakter.py ada/assets/ece/raw/ece_referans.png ada/assets/ece/raw 1.72 463:Jump 516:Slide 477:RopeHang

Durum <çıktı>/durum.json içinde tutulur; yarıda kalırsa aynı komut kaldığı yerden devam eder.
"""
import base64, json, os, subprocess, sys, time

BASE = "https://api.meshy.ai/openapi/v1/"


def curl(args, timeout=120):
    r = subprocess.run(["curl", "-sS", "--max-time", str(timeout)] + args, capture_output=True, text=True)
    return r.stdout


def post(path, body):
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(body, f)
        tmp = f.name
    try:
        out = curl(["-X", "POST", BASE + path, "-H", "Content-Type: application/json", "--data-binary", "@" + tmp])
    finally:
        os.unlink(tmp)
    d = json.loads(out)
    if "result" not in d:
        raise SystemExit(f"HATA {path}: {out[:400]}")
    return d["result"]


def wait(path, tid, label):
    t0 = time.time()
    while True:
        d = json.loads(curl([BASE + path + "/" + tid]) or "{}")
        st, pr = d.get("status"), d.get("progress")
        print(f"  {label}: {st} {pr}%", flush=True)
        if st == "SUCCEEDED":
            return d
        if st in ("FAILED", "CANCELED", "EXPIRED"):
            raise SystemExit(f"BAŞARISIZ {label}: {json.dumps(d.get('task_error', d))[:400]}")
        if time.time() - t0 > 3600:
            raise SystemExit(f"ZAMAN AŞIMI {label}")
        time.sleep(12)


def download(url, path):
    subprocess.run(["curl", "-sS", "--max-time", "600", "-o", path, url], check=True)
    print(f"  indirildi {os.path.basename(path)} ({os.path.getsize(path) // 1024} KB)", flush=True)


def balance():
    try:
        return json.loads(curl([BASE + "balance"]))["balance"]
    except Exception:
        return None


def main():
    ref, out, height = sys.argv[1], sys.argv[2], float(sys.argv[3])
    anims = [a.split(":") for a in sys.argv[4:]]
    os.makedirs(out, exist_ok=True)
    sp = os.path.join(out, "durum.json")
    st = json.load(open(sp)) if os.path.exists(sp) else {}
    save = lambda: json.dump(st, open(sp, "w"), indent=1)
    if "baslangic_bakiye" not in st:
        st["baslangic_bakiye"] = balance()
        save()
    print("başlangıç bakiyesi:", st["baslangic_bakiye"], flush=True)

    # 1) Görselden 3D
    if "model_task" not in st:
        from io import BytesIO
        from PIL import Image
        im = Image.open(ref).convert("RGB")
        im.thumbnail((1024, 1024))
        buf = BytesIO()
        im.save(buf, "JPEG", quality=92)
        uri = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
        st["model_task"] = post("image-to-3d", {
            "image_url": uri,
            "pose_mode": "t-pose",
            "should_remesh": True,
            "topology": "triangle",
            "target_polycount": 20000,
            "should_texture": True,
            "enable_pbr": True,
            "target_formats": ["glb"],
        })
        save()
    print("1) görselden 3D:", st["model_task"], flush=True)
    d = wait("image-to-3d", st["model_task"], "model")
    if not os.path.exists(os.path.join(out, "model.glb")):
        download(d["model_urls"]["glb"], os.path.join(out, "model.glb"))
        for i, u in enumerate(d.get("thumbnail_url") and [d["thumbnail_url"]] or []):
            download(u, os.path.join(out, f"onizleme_{i}.png"))

    # 2) İskelet
    if "rig_task" not in st:
        st["rig_task"] = post("rigging", {"input_task_id": st["model_task"], "height_meters": height})
        save()
    print("2) iskelet:", st["rig_task"], flush=True)
    d = wait("rigging", st["rig_task"], "iskelet")
    res = d.get("result", d)
    if not os.path.exists(os.path.join(out, "rigged.glb")):
        download(res["rigged_character_glb_url"], os.path.join(out, "rigged.glb"))
        ba = res.get("basic_animations") or {}
        for key, name in (("walking_glb_url", "anim_Walk.glb"), ("running_glb_url", "anim_Run.glb")):
            if ba.get(key):
                download(ba[key], os.path.join(out, name))

    # 3) Animasyonlar
    st.setdefault("anim_tasks", {})
    for aid, name in anims:
        if name not in st["anim_tasks"]:
            st["anim_tasks"][name] = post("animations", {"rig_task_id": st["rig_task"], "action_id": int(aid)})
            save()
    for name, tid in st["anim_tasks"].items():
        path = os.path.join(out, f"anim_{name}.glb")
        if os.path.exists(path):
            continue
        d = wait("animations", tid, f"animasyon {name}")
        res = d.get("result", d)
        download(res["animation_glb_url"], path)

    end = balance()
    print("bitiş bakiyesi:", end, flush=True)
    if st.get("baslangic_bakiye") is not None and end is not None:
        print("harcanan:", st["baslangic_bakiye"] - end, flush=True)
    print("TAMAM", flush=True)


if __name__ == "__main__":
    main()
