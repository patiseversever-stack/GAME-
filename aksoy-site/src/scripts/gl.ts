// 3D sahneleri açmadan önce donanım kontrolü. WebGL2 yoksa ya da tarayıcı ekran kartı yerine
// yazılımla çiziyorsa (SwiftShader, llvmpipe: ekran kartsız sunucu/eski cihaz) 3D açılmaz;
// sayfa hafif statik görünümle kalır, takılma olmaz. "?gl" adresi ya da ?debug zorla açar (test).
let cached: boolean | null = null;
export function canUse3D(): boolean {
  if (cached !== null) return cached;
  const q = new URLSearchParams(location.search);
  if (q.has('gl') || q.has('debug')) return (cached = true);
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return (cached = false);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cached = !/swiftshader|llvmpipe|software|softpipe|microsoft basic render/i.test(name);
  } catch {
    cached = false;
  }
  return cached;
}
