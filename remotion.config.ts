// Remotion CLI yapılandırması (studio / render).
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(94);
Config.setConcurrency(4);
Config.setPublicDir('remotion/public');
Config.setEntryPoint('remotion/index.ts');
// Sistemde Remotion'un kendi tarayıcısı yoksa (ör. bulut sandbox) GP_BROWSER ile yerel Chromium verilebilir.
if (process.env.GP_BROWSER) Config.setBrowserExecutable(process.env.GP_BROWSER);
