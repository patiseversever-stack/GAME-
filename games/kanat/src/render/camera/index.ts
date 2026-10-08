// Camera system (render-world): gameplay follow, route intro, replay director, photo mode.
export { FollowCamera, type FollowCameraOptions, type CameraDistanceOption } from './FollowCamera.ts';
export { IntroCamera, routePoint } from './IntroCamera.ts';
export { ReplayDirector, type ReplayFrame, type ReplayShot, type ShotKind } from './ReplayDirector.ts';
export { PhotoCamera } from './PhotoCamera.ts';
export { Shake, Spring1, Spring3, approach, springScalar } from './springs.ts';
