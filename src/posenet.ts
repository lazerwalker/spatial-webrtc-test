// Adapted from https://github.com/yemount/pose-animator/blob/90d5a58328f16d332c39d4b281298428ebb61e64/camera.js
import * as posenet_module from "@tensorflow-models/posenet";
import * as facemesh_module from "@tensorflow-models/facemesh";
import * as tf from "@tensorflow/tfjs";
import paper from "paper";

import { isMobile } from "./poseNetUtils/demoUtils";
import { PoseIllustration } from "./illustrationGen/illustration";
import { Skeleton } from "./illustrationGen/skeleton";
import { SVGUtils } from "./poseNetUtils/svgUtils";

// Camera stream video element
let videoWidth = 300;
let videoHeight = 300;

// Canvas
let faceDetection = null;
let illustration = null;
let canvasWidth = 800;
let canvasHeight = 800;

// ML models
let facemesh;
let posenet;

let inputVideo: HTMLVideoElement;

/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */
export function detectPoseInRealTime() {
  async function poseDetectionFrame() {
    let poses = [];

    // Creates a tensor from an image
    const input = tf.browser.fromPixels(inputVideo);
    faceDetection = await facemesh.estimateFaces(input, false, false);
    let all_poses = await posenet.estimatePoses(inputVideo, {
      flipHorizontal: true,
      decodingMethod: "multi-person",
      maxDetections: 1,
      scoreThreshold: 0.15,
      nmsRadius: 30.0,
    });

    poses = poses.concat(all_poses);
    input.dispose();

    paper.project.clear();

    if (poses.length >= 1 && illustration) {
      Skeleton.flipPose(poses[0]);

      if (faceDetection && faceDetection.length > 0) {
        let face = Skeleton.toFaceFrame(faceDetection[0]);
        illustration.updateSkeleton(poses[0], face);
      } else {
        illustration.updateSkeleton(poses[0], null);
      }
      illustration.draw(paper, 0, 0);
    }

    // paper.project.activeLayer.scale(
    //   canvasWidth / videoWidth,
    //   canvasHeight / videoHeight,
    //   new paper.Point(0, 0)
    // );

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

function setupCanvas(output: HTMLCanvasElement) {
  if (isMobile()) {
    canvasWidth = Math.min(window.innerWidth, window.innerHeight);
    canvasHeight = canvasWidth;
    videoWidth *= 0.7;
    videoHeight *= 0.7;
  }

  output.width = canvasWidth;
  output.height = canvasHeight;
  console.log(output.width, output.height);
  paper.setup(output);
}

const setVideoHeight = async (el: HTMLVideoElement): Promise<number> => {
  if (el.height && el.width) {
    return el.height;
  }

  if (el.videoHeight && el.videoWidth) {
    el.height = el.videoHeight;
    el.width = el.videoWidth;
    return el.height;
  } else {
    return await setVideoHeight(el);
  }
};

async function parseSVG(target) {
  const scope = await SVGUtils.importSVG(`./svgs/${target}.svg`);
  let skeleton = new Skeleton(scope);
  illustration = new PoseIllustration(paper);
  illustration.bindSkeleton(skeleton, scope);
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
export async function setUpPosenet(
  input: HTMLVideoElement,
  output: HTMLCanvasElement
) {
  inputVideo = input;

  setupCanvas(output);

  console.log("Loading PoseNet model...");
  posenet = await posenet_module.load({
    architecture: "MobileNetV1",
    outputStride: 16,
    inputResolution: 257,
    multiplier: 1.0,
    quantBytes: 2,
  });
  console.log("Loading FaceMesh model...");
  facemesh = await facemesh_module.load();

  await parseSVG("girl");
  await setVideoHeight(inputVideo);

  detectPoseInRealTime();
}
