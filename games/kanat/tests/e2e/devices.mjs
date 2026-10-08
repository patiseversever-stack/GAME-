// Device profiles (§9.1). Each has portrait and landscape variants. FPS under SwiftShader is meaningless;
// these profiles exist for layout, touch and DPR behaviour.

export const DEVICES = {
  iphone11: { name: 'iPhone 11', width: 414, height: 896, dpr: 2, ios: true },
  iphone13: { name: 'iPhone 13', width: 390, height: 844, dpr: 3, ios: true },
  mi9t: { name: 'Mi 9T', width: 393, height: 851, dpr: 2.75, ios: false },
  xiaomi13: { name: 'Xiaomi 13', width: 393, height: 873, dpr: 2.75, ios: false },
  small: { name: 'Küçük', width: 360, height: 640, dpr: 2, ios: false },
  tablet: { name: 'Tablet', width: 820, height: 1180, dpr: 2, ios: false },
};

const UA_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1';
const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 13; 2211133G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';

/** Playwright context options for a device + orientation. */
export function contextOptions(id, orientation = 'portrait') {
  const d = DEVICES[id];
  if (!d) throw new Error(`unknown device ${id}`);
  const portrait = orientation === 'portrait';
  return {
    viewport: { width: portrait ? d.width : d.height, height: portrait ? d.height : d.width },
    deviceScaleFactor: d.dpr,
    isMobile: true,
    hasTouch: true,
    userAgent: d.ios ? UA_IOS : UA_ANDROID,
  };
}

/** Every device × orientation (for matrix runs). */
export function allProfiles() {
  const out = [];
  for (const id of Object.keys(DEVICES)) for (const o of ['portrait', 'landscape']) out.push({ id, orientation: o, label: `${DEVICES[id].name} ${o}` });
  return out;
}
