// `spacegraphjs/world` — optional scene features and sensory descriptors. Pure: the host owns lights,
// fog, instancing and any sensory adapter (P4.4-P4.5).

export {
    SCENE_FEATURES,
    SENSORY_DESCRIPTORS,
    SENSORY_SEAMS,
    enabledSceneFeatures,
    registerSensory,
    sceneFeatures,
    sensoryAdapter,
    supportsSceneFeature,
    supportsSensory,
    worldPolicyFor,
    worldRepresentation,
} from './world';
export type {
    RegisteredSensorySeam,
    SceneFeature,
    SensoryAdapter,
    SensoryDescriptor,
    SensorySeam,
    WorldCapabilities,
    WorldPolicy,
    WorldRepresentation,
} from './world';
export { PLAY_PRESETS, createPhysicsPlaySession } from './PhysicsPlaySession';
export type {
    GravityPreset,
    PhysicsPlaySession,
    PlaySettings,
    PlaySimulation,
} from './PhysicsPlaySession';
