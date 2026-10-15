# Ön ortografik görüntüden MediaPipe yüz noktaları → JSON (piksel, normalize)
import json, sys
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
img_path, model, out = sys.argv[1], sys.argv[2], sys.argv[3]
opts = vision.FaceLandmarkerOptions(base_options=mpt.BaseOptions(model_asset_path=model), num_faces=1,
                                    output_face_blendshapes=False, min_face_detection_confidence=0.2, min_face_presence_confidence=0.2)
det = vision.FaceLandmarker.create_from_options(opts)
res = det.detect(mp.Image.create_from_file(img_path))
if not res.face_landmarks:
    print("YÜZ BULUNAMADI"); sys.exit(1)
pts = [[p.x, p.y, p.z] for p in res.face_landmarks[0]]
json.dump(pts, open(out, "w")); print(len(pts), "nokta")
