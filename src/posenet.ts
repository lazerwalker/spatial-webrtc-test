// Adapted from https://github.com/yemount/pose-animator/blob/90d5a58328f16d332c39d4b281298428ebb61e64/camera.js
import * as posenet from "@tensorflow-models/posenet";
import * as facemesh from "@tensorflow-models/facemesh";
import * as tf from "@tensorflow/tfjs";
import paper from "paper";

import { isMobile } from "./poseNetUtils/demoUtils";
import { PoseIllustration } from "./illustrationGen/illustration";
import { Skeleton } from "./illustrationGen/skeleton";
import { SVGUtils } from "./poseNetUtils/svgUtils";

interface SkeletonData {
  pose?: posenet.Pose;
  face?: facemesh.AnnotatedPrediction;
}

type SkeletonDataHandler = (skeleton: SkeletonData) => void;

// ML models
let facemeshNet: facemesh.FaceMesh;
let posenetNet: posenet.PoseNet;

const getSkeleton = async (input: HTMLVideoElement): Promise<SkeletonData> => {
  const tensor = tf.browser.fromPixels(input);
  const face = await facemeshNet.estimateFaces(tensor, false, false);
  const poses = await posenetNet.estimatePoses(input, {
    flipHorizontal: true,
    decodingMethod: "multi-person",
    maxDetections: 1,
    scoreThreshold: 0.15,
    nmsRadius: 30.0,
  });

  tensor.dispose();

  return {
    pose: poses[0],
    face: face[0],
  };
};

export function drawSkeleton(
  skeleton: SkeletonData,
  illustration: PoseIllustration
) {
  paper.project.clear();

  if (!skeleton.pose) {
    return;
  }

  Skeleton.flipPose(skeleton.pose);

  if (skeleton.face) {
    let face = Skeleton.toFaceFrame(skeleton.face);
    illustration.updateSkeleton(skeleton.pose, face);
  } else {
    console.log("WARNING: No face detected");
  }
  const group = illustration.draw();

  group.position = new paper.Point(50, 80);
  paper.project.activeLayer.addChild(group);
}

const detectAndDrawPose = (
  inputVideo: HTMLVideoElement,
  illustration: PoseIllustration,
  onSkeletonUpdate?: SkeletonDataHandler
) => {
  async function poseDetectionFrame() {
    const skeleton = await getSkeleton(inputVideo);
    if (onSkeletonUpdate) {
      onSkeletonUpdate(skeleton);
    }

    drawSkeleton(skeleton, illustration);
    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
};

function setupCanvas(output: HTMLCanvasElement) {
  let canvasWidth = 800;
  let canvasHeight = 800;

  if (isMobile()) {
    canvasWidth = Math.min(window.innerWidth, window.innerHeight);
    canvasHeight = canvasWidth;
  }

  output.width = canvasWidth;
  output.height = canvasHeight;

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

export async function parseSVG(target: string): Promise<PoseIllustration> {
  const scope = await SVGUtils.importSVG(`./svgs/${target}.svg`);
  let skeleton = new Skeleton(scope);
  const illustration = new PoseIllustration(skeleton, scope, paper);
  return illustration;
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
export async function setUpPosenet({
  input,
  output,
  onSkeletonUpdate,
}: {
  input: HTMLVideoElement;
  output: HTMLCanvasElement;
  onSkeletonUpdate?: SkeletonDataHandler;
}) {
  const inputVideo = input;

  setupCanvas(output);

  console.log("Loading PoseNet model...");
  posenetNet = await posenet.load({
    architecture: "MobileNetV1",
    outputStride: 16,
    inputResolution: 257,
    multiplier: 1.0,
    quantBytes: 2,
  });
  console.log("Loading FaceMesh model...");
  facemeshNet = await facemesh.load();

  const illustration = await parseSVG("girl");
  await setVideoHeight(inputVideo);

  detectAndDrawPose(inputVideo, illustration, onSkeletonUpdate);
}
