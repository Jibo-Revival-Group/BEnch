/**
 * Notes:
 *
 * The VisualAwareness class in this file (and all its component classes) represents
 * the VisualAwareness JSON object that gets published in the LPS stream:
 * https://confluence.jibo.com/display/ENG/LPS+Service#LPSService-VisualAwareness
 *
 * However, the classes here are a simplified version of the above. Just enough data
 * is published to allow simulated human users ("targets") to appear in the Jibo
 * simulator. It's not necessary to publish a lot of the visual processing data that
 * appears on the actual robot, which is intended to deal with the visually messy
 * state of the real world.
 *
 * Here, in the simulator, we assume that targets (simulated users) are continuous
 * presences and that Jibo is 100% reliable at detecting their existence and
 * location. The goal, when using the simulator, is to make sure that Jibo's
 * reponses to users and their movements model whatever behaviors the skill
 * developer considered to be socially appropriate in context.
 *
 * Places where this data is used:
 *
 * For skills:
 * - Monitor through jibo.lps.motionData()
 *
 * Attention Manager
 * - sdk/packages/jibo-attention-manager/lib/src/DataConverter.js: acceptVision()
 * - skd/packages/jibo-attention-manager/src/VisionModalityHandler.js
 *
 * Behavior Tree in Skill
 * - In Lookat behavior's getTarget(), call jibo.lps.getClosestVisualEntity()
 *
 */

/**
 * Maps to an Entity in the VisualAwareness JSON (see below)
 */

/**
 * Implements structure version of VisualAwareness JSON object.
 * See: https://confluence.jibo.com/display/ENG/LPS+Service#LPSService-VisualAwareness
 *
 * The VisualAwareness contains all the information being tracked using image processing techniques.
 * All 3D coordinates and transformations are in world space. All 2D coordinates and transformations
 * are in image space. The information provided contains the current camera transformations, the
 * entities they are tracking, the component parts of the entities, the pick-rays of the camera to
 * the part, the image trackers associated with each part of each entity. The overall awareness of
 * sectors around the robot is included as well as dynamic lighting information for each sector
 * around the robot.
 */