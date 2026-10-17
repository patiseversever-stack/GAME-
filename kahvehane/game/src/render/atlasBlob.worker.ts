// Deste atlasını PNG'ye kodlayan işçi: GPU tuvalinden alınan ImageBitmap burada geri okunur ve kodlanır (ana iş parçacığı beklemez).
// Bkz. src/render/atlasBlob.ts.
type Req = {id: number; bm: ImageBitmap};
self.onmessage = async (e: MessageEvent<Req>) => {
  const {id, bm} = e.data;
  try {
    const oc = new OffscreenCanvas(bm.width, bm.height);
    const br = oc.getContext('bitmaprenderer');
    if (br) br.transferFromImageBitmap(bm);
    else {
      oc.getContext('2d')!.drawImage(bm, 0, 0);
      bm.close();
    }
    const blob = await oc.convertToBlob({type: 'image/png'});
    self.postMessage({id, blob});
  } catch {
    self.postMessage({id, blob: null});
  }
};
