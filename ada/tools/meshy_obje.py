"""Meshy ile obje hattı: referans görsel -> dokulu 3D model (iskeletsiz).

Anahtar istekte yazılmaz: ortamın ağ gizli anahtarı api.meshy.ai isteklerine ekler.
Kullanım: python3 ada/tools/meshy_obje.py <çıktı klasörü> <poligon> <ad=görsel.png> ...
Durum <çıktı>/durum.json içinde; yarıda kalırsa kaldığı yerden devam eder.
"""
import base64, json, os, subprocess, sys, tempfile, time
from io import BytesIO

BASE = "https://api.meshy.ai/openapi/v1/"


def curl(args, timeout=120):
    return subprocess.run(["curl", "-sS", "--max-time", str(timeout)] + args, capture_output=True, text=True).stdout


def post(path, body):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(body, f)
        tmp = f.name
    try:
        out = curl(["-X", "POST", BASE + path, "-H", "Content-Type: application/json", "--data-binary", "@" + tmp])
    finally:
        os.unlink(tmp)
    d = json.loads(out)
    if "result" not in d:
        raise SystemExit(f"HATA {path}: {out[:300]}")
    return d["result"]


def balance():
    try:
        return json.loads(curl([BASE + "balance"]))["balance"]
    except Exception:
        return None


def data_uri(path):
    from PIL import Image
    im = Image.open(path).convert("RGB")
    im.thumbnail((1024, 1024))
    buf = BytesIO()
    im.save(buf, "JPEG", quality=92)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def main():
    out, poly = sys.argv[1], int(sys.argv[2])
    items = [a.split("=", 1) for a in sys.argv[3:]]
    os.makedirs(out, exist_ok=True)
    sp = os.path.join(out, "durum.json")
    st = json.load(open(sp)) if os.path.exists(sp) else {}
    save = lambda: json.dump(st, open(sp, "w"), indent=1)
    st.setdefault("baslangic_bakiye", balance())
    st.setdefault("gorevler", {})
    save()
    print("başlangıç bakiyesi:", st["baslangic_bakiye"], flush=True)
    for name, img in items:
        if name in st["gorevler"]:
            continue
        st["gorevler"][name] = post("image-to-3d", {
            "image_url": data_uri(img),
            "should_remesh": True,
            "topology": "triangle",
            "target_polycount": poly,
            "should_texture": True,
            "enable_pbr": True,
            "target_formats": ["glb"],
        })
        save()
        print("oluşturuldu", name, flush=True)
    pending = dict(st["gorevler"])
    t0 = time.time()
    while pending and time.time() - t0 < 3600:
        for name, tid in list(pending.items()):
            path = os.path.join(out, f"{name}.glb")
            if os.path.exists(path):
                del pending[name]
                continue
            d = json.loads(curl([BASE + "image-to-3d/" + tid]) or "{}")
            s = d.get("status")
            if s == "SUCCEEDED":
                subprocess.run(["curl", "-sS", "--max-time", "600", "-o", path, d["model_urls"]["glb"]], check=True)
                if d.get("thumbnail_url"):
                    subprocess.run(["curl", "-sS", "--max-time", "120", "-o", os.path.join(out, f"{name}_onizleme.png"), d["thumbnail_url"]])
                print("indirildi", name, os.path.getsize(path) // 1024, "KB", flush=True)
                del pending[name]
            elif s in ("FAILED", "CANCELED", "EXPIRED"):
                print("BAŞARISIZ", name, json.dumps(d.get("task_error", d))[:300], flush=True)
                del pending[name]
            else:
                print(f"  {name}: {s} {d.get('progress')}%", flush=True)
        time.sleep(12)
    end = balance()
    print("bitiş bakiyesi:", end, "harcanan:", (st["baslangic_bakiye"] or 0) - (end or 0), flush=True)
    print("TAMAM", flush=True)


if __name__ == "__main__":
    main()
