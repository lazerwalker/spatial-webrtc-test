/**
 * @license
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import paper from "paper";
import { SVGUtils } from "../poseNetUtils/svgUtils";
import { MathUtils } from "../poseNetUtils/mathUtils";
import { ColorUtils } from "../poseNetUtils/colorUtils";
import { Pose } from "@tensorflow-models/posenet";
import { AnnotatedPrediction } from "@tensorflow-models/facemesh";
import { PoseIllustration, Skinning } from "./illustration";

export interface PointTransform {
  transform: paper.Point;
  anchorPerc: number; // Is this a percentage?
}

interface Part {
  position: paper.Point;
  score: number;
}

export interface FaceFrame {
  positions: number[];
  faceInViewConfidence: number;
}

const MIN_POSE_SCORE = 0.1;
const MIN_FACE_SCORE = 0.8;

const legPartNames = ["leftKnee", "leftAnkle", "rightKnee", "rightAnkle"];

const posePartNames = [
  "leftHip",
  "leftWrist",
  "leftElbow",
  "leftShoulder",
  "rightHip",
  "rightWrist",
  "rightElbow",
  "rightShoulder",
  "leftEar",
  "rightEar",
];

// Mapping between face part names and their vertex indices in TF face mesh.
export const facePartName2Index: { [name: string]: number } = {
  topMid: 10,
  rightTop0: 67,
  rightTop1: 54,
  leftTop0: 297,
  leftTop1: 284,
  rightJaw0: 21,
  rightJaw1: 162,
  rightJaw2: 127,
  rightJaw3: 234,
  rightJaw4: 132,
  rightJaw5: 172,
  rightJaw6: 150,
  rightJaw7: 176,
  jawMid: 152, // 0 - 8
  leftJaw7: 400,
  leftJaw6: 379,
  leftJaw5: 397,
  leftJaw4: 361,
  leftJaw3: 454,
  leftJaw2: 356,
  leftJaw1: 389,
  leftJaw0: 251, // 9 - 16
  rightBrow0: 46,
  rightBrow1: 53,
  rightBrow2: 52,
  rightBrow3: 65,
  rightBrow4: 55, // 17 - 21
  leftBrow4: 285,
  leftBrow3: 295,
  leftBrow2: 282,
  leftBrow1: 283,
  leftBrow0: 276, // 22 - 26
  nose0: 6,
  nose1: 197,
  nose2: 195,
  nose3: 5, // 27 - 30
  rightNose0: 48,
  rightNose1: 220,
  nose4: 4,
  leftNose1: 440,
  leftNose0: 278, // 31 - 35
  rightEye0: 33,
  rightEye1: 160,
  rightEye2: 158,
  rightEye3: 133,
  rightEye4: 153,
  rightEye5: 144, // 36 - 41
  leftEye3: 362,
  leftEye2: 385,
  leftEye1: 387,
  leftEye0: 263,
  leftEye5: 373,
  leftEye4: 380, // 42 - 47
  rightMouthCorner: 61,
  rightUpperLipTop0: 40,
  rightUpperLipTop1: 37,
  upperLipTopMid: 0,
  leftUpperLipTop1: 267,
  leftUpperLipTop0: 270,
  leftMouthCorner: 291, // 48 - 54
  leftLowerLipBottom0: 321,
  leftLowerLipBottom1: 314,
  lowerLipBottomMid: 17,
  rightLowerLipBottom1: 84,
  rightLowerLipBottom0: 91, // 55 - 59
  rightMiddleLip: 78,
  rightUpperLipBottom1: 81,
  upperLipBottomMid: 13,
  leftUpperLipBottom1: 311,
  leftMiddleLip: 308, // 60 - 64
  leftLowerLipTop0: 402,
  lowerLipTopMid: 14,
  rightLowerLipTop0: 178, // 65 - 67
};

const facePartNames = [
  "topMid",
  "rightTop0",
  "rightTop1",
  "leftTop0",
  "leftTop1",
  "rightJaw0",
  "rightJaw1",
  "rightJaw2",
  "rightJaw3",
  "rightJaw4",
  "rightJaw5",
  "rightJaw6",
  "rightJaw7",
  "jawMid", // 0 - 8
  "leftJaw7",
  "leftJaw6",
  "leftJaw5",
  "leftJaw4",
  "leftJaw3",
  "leftJaw2",
  "leftJaw1",
  "leftJaw0", // 9 - 16
  "rightBrow0",
  "rightBrow1",
  "rightBrow2",
  "rightBrow3",
  "rightBrow4", // 17 - 21
  "leftBrow4",
  "leftBrow3",
  "leftBrow2",
  "leftBrow1",
  "leftBrow0", // 22 - 26
  "nose0",
  "nose1",
  "nose2",
  "nose3", // 27 - 30
  "rightNose0",
  "rightNose1",
  "nose4",
  "leftNose1",
  "leftNose0", // 31 - 35
  "rightEye0",
  "rightEye1",
  "rightEye2",
  "rightEye3",
  "rightEye4",
  "rightEye5", // 36 - 41
  "leftEye3",
  "leftEye2",
  "leftEye1",
  "leftEye0",
  "leftEye5",
  "leftEye4", // 42 - 47
  "rightMouthCorner",
  "rightUpperLipTop0",
  "rightUpperLipTop1",
  "upperLipTopMid",
  "leftUpperLipTop1",
  "leftUpperLipTop0",
  "leftMouthCorner", // 48 - 54
  "leftLowerLipBottom0",
  "leftLowerLipBottom1",
  "lowerLipBottomMid",
  "rightLowerLipBottom1",
  "rightLowerLipBottom0", // 55 - 59
  "rightMiddleLip",
  "rightUpperLipBottom1",
  "upperLipBottomMid",
  "leftUpperLipBottom1",
  "leftMiddleLip", // 60 - 64
  "leftLowerLipTop0",
  "lowerLipTopMid",
  "rightLowerLipTop0", // 65 - 67
];

export const allPartNames = posePartNames.concat(facePartNames, legPartNames);

export interface BonePoint {
  baseTransFunc?: Function;
  currentPosition: paper.Point;
  name: string;
  position: paper.Point;
  transformFunc: Function;
}

// Represents a bone formed by two part keypoints.
export class Bone {
  kp0: BonePoint;
  kp1: BonePoint;
  boneColor: paper.Color;
  name: string;
  type: string;
  skeleton: Skeleton;

  score?: number;
  latestCenter?: paper.Point;

  parent?: Bone;

  constructor(
    kp0: BonePoint | null,
    kp1: BonePoint | null,
    skeleton: Skeleton,
    type: string
  ) {
    if (!kp0 || !kp1)
      throw `Missing a bone point when constructing a bone of type ${type}`;

    this.name = `${kp0.name}-${kp1.name}`;
    this.kp0 = kp0;
    this.kp1 = kp1;
    this.skeleton = skeleton;
    this.type = type;
    this.boneColor = ColorUtils.fromStringHash(this.name);
    this.boneColor.saturation += 0.5;
    return this;
  }

  // Finds a point's bone transform.
  // Let anchor be the closest point on the bone to the point.
  // A point's bone transformation is the transformation from anchor to the point.
  getPointTransform(p: paper.Point): PointTransform {
    let dir = this.kp1.position.subtract(this.kp0.position).normalize();
    let n = dir.clone();
    n.angle += 90;
    let closestP = MathUtils.getClosestPointOnSegment(
      this.kp0.position,
      this.kp1.position,
      p
    );
    let v = p.subtract(closestP);
    let dirProjD = v.dot(dir);
    let dirProjN = v.dot(n);
    let d = this.kp0.position.subtract(this.kp1.position).length;
    let anchorPerc = closestP.subtract(this.kp0.position).length / d;
    return {
      transform: new paper.Point(dirProjD, dirProjN),
      anchorPerc: anchorPerc,
    };
  }

  // Finds a point's current position from the current bone position.
  transform(transform: PointTransform) {
    if (!this.kp1.currentPosition || !this.kp0.currentPosition) {
      return;
    }
    // Scale distance from anchor point base on bone type.
    // All face bones will share one distance scale. All body bones share another.
    let scale =
      this.type === "face"
        ? this.skeleton.currentFaceScale
        : this.skeleton.currentBodyScale;
    if (scale === undefined) {
      scale = 1;
    }

    let dir = this.kp1.currentPosition
      .subtract(this.kp0.currentPosition)
      .normalize();
    let n = dir.clone();
    n.angle += 90;
    let anchor = this.kp0.currentPosition
      .multiply(1 - transform.anchorPerc)
      .add(this.kp1.currentPosition.multiply(transform.anchorPerc));
    let p = anchor
      .add(dir.multiply(transform.transform.x * scale))
      .add(n.multiply(transform.transform.y * scale));
    return p;
  }
}

function getKeyPointFromSVG(
  group: paper.Item,
  partName: string
): BonePoint | null {
  let shape = SVGUtils.findFirstItemWithPrefix(group, partName);
  if (!shape) return null;
  return {
    position: shape.bounds.center,
    currentPosition: shape.bounds.center,
    name: partName,
    transformFunc: () => {},
  };
}

function getPartFromPose(pose: Pose, name: string): Part | null {
  if (!pose || !pose.keypoints) {
    return null;
  }
  let part = pose.keypoints.find((kp) => kp.part === name);
  if (!part) {
    console.log("getPartFromPose could not find par");
    return null;
  }
  return {
    position: new paper.Point(part.position.x, part.position.y),
    score: part.score,
  };
}

function getKeypointFromFaceFrame(face: FaceFrame, i: number) {
  return new paper.Point(face.positions[i * 2], face.positions[i * 2 + 1]);
}

// Represents a full body skeleton.
export class Skeleton {
  bones: Bone[];
  isValid: Boolean = false;

  currentFaceScale?: number;
  currentBodyScale?: number;

  boneGroups: { [name: string]: Bone[] };
  parts: { [name: string]: Part } = {};

  faceBones: Bone[] = [];
  secondaryBones: Bone[] = [];
  bodyBones: Bone[] = [];
  bodyLen0: number;
  faceLen0: number;

  bNose3Nose4: Bone;
  leftEarP2FFunc: any;
  rightEarP2FFunc: any;

  constructor(scope: paper.PaperScope) {
    let skeletonGroup = SVGUtils.findFirstItemWithPrefix(
      scope.project,
      "skeleton"
    );

    if (!skeletonGroup)
      throw "Skeleton not found! Double-check your SVG has a group called 'skeleton'";

    // Pose
    let leftAnkle = getKeyPointFromSVG(skeletonGroup, "leftAnkle");
    let leftKnee = getKeyPointFromSVG(skeletonGroup, "leftKnee");
    let leftHip = getKeyPointFromSVG(skeletonGroup, "leftHip");
    let leftWrist = getKeyPointFromSVG(skeletonGroup, "leftWrist");
    let leftElbow = getKeyPointFromSVG(skeletonGroup, "leftElbow");
    let leftShoulder = getKeyPointFromSVG(skeletonGroup, "leftShoulder");
    let rightAnkle = getKeyPointFromSVG(skeletonGroup, "rightAnkle");
    let rightKnee = getKeyPointFromSVG(skeletonGroup, "rightKnee");
    let rightHip = getKeyPointFromSVG(skeletonGroup, "rightHip");
    let rightWrist = getKeyPointFromSVG(skeletonGroup, "rightWrist");
    let rightElbow = getKeyPointFromSVG(skeletonGroup, "rightElbow");
    let rightShoulder = getKeyPointFromSVG(skeletonGroup, "rightShoulder");

    // Face
    let topMid = getKeyPointFromSVG(skeletonGroup, "topMid");
    let rightTop0 = getKeyPointFromSVG(skeletonGroup, "rightTop0");
    let rightTop1 = getKeyPointFromSVG(skeletonGroup, "rightTop1");
    let leftTop0 = getKeyPointFromSVG(skeletonGroup, "leftTop0");
    let leftTop1 = getKeyPointFromSVG(skeletonGroup, "leftTop1");
    let leftJaw2 = getKeyPointFromSVG(skeletonGroup, "leftJaw2");
    let leftJaw3 = getKeyPointFromSVG(skeletonGroup, "leftJaw3");
    let leftJaw4 = getKeyPointFromSVG(skeletonGroup, "leftJaw4");
    let leftJaw5 = getKeyPointFromSVG(skeletonGroup, "leftJaw5");
    let leftJaw6 = getKeyPointFromSVG(skeletonGroup, "leftJaw6");
    let leftJaw7 = getKeyPointFromSVG(skeletonGroup, "leftJaw7");
    let jawMid = getKeyPointFromSVG(skeletonGroup, "jawMid");
    let rightJaw2 = getKeyPointFromSVG(skeletonGroup, "rightJaw2");
    let rightJaw3 = getKeyPointFromSVG(skeletonGroup, "rightJaw3");
    let rightJaw4 = getKeyPointFromSVG(skeletonGroup, "rightJaw4");
    let rightJaw5 = getKeyPointFromSVG(skeletonGroup, "rightJaw5");
    let rightJaw6 = getKeyPointFromSVG(skeletonGroup, "rightJaw6");
    let rightJaw7 = getKeyPointFromSVG(skeletonGroup, "rightJaw7");
    let nose0 = getKeyPointFromSVG(skeletonGroup, "nose0");
    let nose1 = getKeyPointFromSVG(skeletonGroup, "nose1");
    let nose2 = getKeyPointFromSVG(skeletonGroup, "nose2");
    let nose3 = getKeyPointFromSVG(skeletonGroup, "nose3");
    let nose4 = getKeyPointFromSVG(skeletonGroup, "nose4");
    let leftNose0 = getKeyPointFromSVG(skeletonGroup, "leftNose0");
    let leftNose1 = getKeyPointFromSVG(skeletonGroup, "leftNose1");
    let rightNose0 = getKeyPointFromSVG(skeletonGroup, "rightNose0");
    let rightNose1 = getKeyPointFromSVG(skeletonGroup, "rightNose1");
    let leftEye0 = getKeyPointFromSVG(skeletonGroup, "leftEye0");
    let leftEye1 = getKeyPointFromSVG(skeletonGroup, "leftEye1");
    let leftEye2 = getKeyPointFromSVG(skeletonGroup, "leftEye2");
    let leftEye3 = getKeyPointFromSVG(skeletonGroup, "leftEye3");
    let leftEye4 = getKeyPointFromSVG(skeletonGroup, "leftEye4");
    let leftEye5 = getKeyPointFromSVG(skeletonGroup, "leftEye5");
    let rightEye0 = getKeyPointFromSVG(skeletonGroup, "rightEye0");
    let rightEye1 = getKeyPointFromSVG(skeletonGroup, "rightEye1");
    let rightEye2 = getKeyPointFromSVG(skeletonGroup, "rightEye2");
    let rightEye3 = getKeyPointFromSVG(skeletonGroup, "rightEye3");
    let rightEye4 = getKeyPointFromSVG(skeletonGroup, "rightEye4");
    let rightEye5 = getKeyPointFromSVG(skeletonGroup, "rightEye5");
    let leftBrow0 = getKeyPointFromSVG(skeletonGroup, "leftBrow0");
    let leftBrow1 = getKeyPointFromSVG(skeletonGroup, "leftBrow1");
    let leftBrow2 = getKeyPointFromSVG(skeletonGroup, "leftBrow2");
    let leftBrow3 = getKeyPointFromSVG(skeletonGroup, "leftBrow3");
    let leftBrow4 = getKeyPointFromSVG(skeletonGroup, "leftBrow4");
    let rightBrow0 = getKeyPointFromSVG(skeletonGroup, "rightBrow0");
    let rightBrow1 = getKeyPointFromSVG(skeletonGroup, "rightBrow1");
    let rightBrow2 = getKeyPointFromSVG(skeletonGroup, "rightBrow2");
    let rightBrow3 = getKeyPointFromSVG(skeletonGroup, "rightBrow3");
    let rightBrow4 = getKeyPointFromSVG(skeletonGroup, "rightBrow4");
    let leftMouthCorner = getKeyPointFromSVG(skeletonGroup, "leftMouthCorner");
    let leftUpperLipTop0 = getKeyPointFromSVG(
      skeletonGroup,
      "leftUpperLipTop0"
    );
    let leftUpperLipTop1 = getKeyPointFromSVG(
      skeletonGroup,
      "leftUpperLipTop1"
    );
    let upperLipTopMid = getKeyPointFromSVG(skeletonGroup, "upperLipTopMid");
    let rightMouthCorner = getKeyPointFromSVG(
      skeletonGroup,
      "rightMouthCorner"
    );
    let rightUpperLipTop0 = getKeyPointFromSVG(
      skeletonGroup,
      "rightUpperLipTop0"
    );
    let rightUpperLipTop1 = getKeyPointFromSVG(
      skeletonGroup,
      "rightUpperLipTop1"
    );
    let rightMiddleLip = getKeyPointFromSVG(skeletonGroup, "rightMiddleLip");
    let rightUpperLipBottom1 = getKeyPointFromSVG(
      skeletonGroup,
      "rightUpperLipBottom1"
    );
    let leftMiddleLip = getKeyPointFromSVG(skeletonGroup, "leftMiddleLip");
    let leftUpperLipBottom1 = getKeyPointFromSVG(
      skeletonGroup,
      "leftUpperLipBottom1"
    );
    let upperLipBottomMid = getKeyPointFromSVG(
      skeletonGroup,
      "upperLipBottomMid"
    );
    let rightLowerLipTop0 = getKeyPointFromSVG(
      skeletonGroup,
      "rightLowerLipTop0"
    );
    let leftLowerLipTop0 = getKeyPointFromSVG(
      skeletonGroup,
      "leftLowerLipTop0"
    );
    let lowerLipTopMid = getKeyPointFromSVG(skeletonGroup, "lowerLipTopMid");
    let rightLowerLipBottom0 = getKeyPointFromSVG(
      skeletonGroup,
      "rightLowerLipBottom0"
    );
    let rightLowerLipBottom1 = getKeyPointFromSVG(
      skeletonGroup,
      "rightLowerLipBottom1"
    );
    let leftLowerLipBottom0 = getKeyPointFromSVG(
      skeletonGroup,
      "leftLowerLipBottom0"
    );
    let leftLowerLipBottom1 = getKeyPointFromSVG(
      skeletonGroup,
      "leftLowerLipBottom1"
    );
    let lowerLipBottomMid = getKeyPointFromSVG(
      skeletonGroup,
      "lowerLipBottomMid"
    );

    let bLeftShoulderRightShoulder = new Bone(
      leftShoulder,
      rightShoulder,
      this,
      "body"
    );
    let bRightShoulderRightHip = new Bone(
      rightShoulder,
      rightHip,
      this,
      "body"
    );
    let bLeftHipRightHip = new Bone(leftHip, rightHip, this, "body");
    let bLeftShoulderLeftHip = new Bone(leftShoulder, leftHip, this, "body");
    let bLeftShoulderLeftElbow = new Bone(
      leftShoulder,
      leftElbow,
      this,
      "body"
    );
    let bLeftElbowLeftWrist = new Bone(leftElbow, leftWrist, this, "body");
    let bRightShoulderRightElbow = new Bone(
      rightShoulder,
      rightElbow,
      this,
      "body"
    );
    let bRightElbowRightWrist = new Bone(rightElbow, rightWrist, this, "body");
    let bLeftHipLeftKnee = new Bone(leftHip, leftKnee, this, "body");
    let bLeftKneeLeftAnkle = new Bone(leftKnee, leftAnkle, this, "body");
    let bRightHipRightKnee = new Bone(rightHip, rightKnee, this, "body");
    let bRightKneeRightAnkle = new Bone(rightKnee, rightAnkle, this, "body");

    let bTopMidRightTop0 = new Bone(topMid, rightTop0, this, "face");
    let bTopMidLeftTop0 = new Bone(topMid, leftTop0, this, "face");
    let bLeftTop0LeftTop1 = new Bone(leftTop0, leftTop1, this, "face");
    let bLeftTop1LeftJaw2 = new Bone(leftTop1, leftJaw2, this, "face");
    let bLeftJaw2LeftJaw3 = new Bone(leftJaw2, leftJaw3, this, "face");
    let bLeftJaw3LeftJaw4 = new Bone(leftJaw3, leftJaw4, this, "face");
    let bLeftJaw4LeftJaw5 = new Bone(leftJaw4, leftJaw5, this, "face");
    let bLeftJaw5LeftJaw6 = new Bone(leftJaw5, leftJaw6, this, "face");
    let bLeftJaw6LeftJaw7 = new Bone(leftJaw6, leftJaw7, this, "face");
    let bLeftJaw7JawMid = new Bone(leftJaw7, jawMid, this, "face");
    let bRightTop0RightTop1 = new Bone(rightTop0, rightTop1, this, "face");
    let bRightTop1RightJaw2 = new Bone(rightTop1, rightJaw2, this, "face");
    let bRightJaw2RightJaw3 = new Bone(rightJaw2, rightJaw3, this, "face");
    let bRightJaw3RightJaw4 = new Bone(rightJaw3, rightJaw4, this, "face");
    let bRightJaw4RightJaw5 = new Bone(rightJaw4, rightJaw5, this, "face");
    let bRightJaw5RightJaw6 = new Bone(rightJaw5, rightJaw6, this, "face");
    let bRightJaw6RightJaw7 = new Bone(rightJaw6, rightJaw7, this, "face");
    let bRightJaw7JawMid = new Bone(rightJaw7, jawMid, this, "face");
    let bLeftEye0LeftEye1 = new Bone(leftEye0, leftEye1, this, "face");
    let bLeftEye1LeftEye2 = new Bone(leftEye1, leftEye2, this, "face");
    let bLeftEye2LeftEye3 = new Bone(leftEye2, leftEye3, this, "face");
    let bLeftEye3LeftEye4 = new Bone(leftEye3, leftEye4, this, "face");
    let bLeftEye4LeftEye5 = new Bone(leftEye4, leftEye5, this, "face");
    let bLeftEye5LeftEye0 = new Bone(leftEye5, leftEye0, this, "face");
    let bRightEye0RightEye1 = new Bone(rightEye0, rightEye1, this, "face");
    let bRightEye1RightEye2 = new Bone(rightEye1, rightEye2, this, "face");
    let bRightEye2RightEye3 = new Bone(rightEye2, rightEye3, this, "face");
    let bRightEye3RightEye4 = new Bone(rightEye3, rightEye4, this, "face");
    let bRightEye4RightEye5 = new Bone(rightEye4, rightEye5, this, "face");
    let bRightEye5RightEye0 = new Bone(rightEye5, rightEye0, this, "face");
    let bLeftBrow0LeftBrow1 = new Bone(leftBrow0, leftBrow1, this, "face");
    let bLeftBrow1LeftBrow2 = new Bone(leftBrow1, leftBrow2, this, "face");
    let bLeftBrow2LeftBrow3 = new Bone(leftBrow2, leftBrow3, this, "face");
    let bLeftBrow3LeftBrow4 = new Bone(leftBrow3, leftBrow4, this, "face");
    let bRightBrow0RightBrow1 = new Bone(rightBrow0, rightBrow1, this, "face");
    let bRightBrow1RightBrow2 = new Bone(rightBrow1, rightBrow2, this, "face");
    let bRightBrow2RightBrow3 = new Bone(rightBrow2, rightBrow3, this, "face");
    let bRightBrow3RightBrow4 = new Bone(rightBrow3, rightBrow4, this, "face");
    let bNose0Nose1 = new Bone(nose0, nose1, this, "face");
    let bNose1Nose2 = new Bone(nose1, nose2, this, "face");
    let bNose2Nose3 = new Bone(nose2, nose3, this, "face");
    let bNose3Nose4 = new Bone(nose3, nose4, this, "face");
    let bLeftNose0LeftNose1 = new Bone(leftNose0, leftNose1, this, "face");
    let bLeftNose1Nose4 = new Bone(leftNose1, nose4, this, "face");
    let bRightNose0RightNose1 = new Bone(rightNose0, rightNose1, this, "face");
    let bRightNose1Nose4 = new Bone(rightNose1, nose4, this, "face");
    let bLeftMouthCornerLeftUpperLipTop0 = new Bone(
      leftMouthCorner,
      leftUpperLipTop0,
      this,
      "face"
    );
    let bLeftUpperLipTop0LeftUpperLipTop1 = new Bone(
      leftUpperLipTop0,
      leftUpperLipTop1,
      this,
      "face"
    );
    let bLeftUpperLipTop1UpperLipTopMid = new Bone(
      leftUpperLipTop1,
      upperLipTopMid,
      this,
      "face"
    );
    let bRigthMouthCornerRigthUpperLipTop0 = new Bone(
      rightMouthCorner,
      rightUpperLipTop0,
      this,
      "face"
    );
    let bRigthUpperLipTop0RigthUpperLipTop1 = new Bone(
      rightUpperLipTop0,
      rightUpperLipTop1,
      this,
      "face"
    );
    let bRigthUpperLipTop1UpperLipTopMid = new Bone(
      rightUpperLipTop1,
      upperLipTopMid,
      this,
      "face"
    );
    let bLeftMouthCornerLeftMiddleLip = new Bone(
      leftMouthCorner,
      leftMiddleLip,
      this,
      "face"
    );
    let bLeftMiddleLipLeftUpperLipBottom1 = new Bone(
      leftMiddleLip,
      leftUpperLipBottom1,
      this,
      "face"
    );
    let bLeftUpperLipBottom1UpperLipBottomMid = new Bone(
      leftUpperLipBottom1,
      upperLipBottomMid,
      this,
      "face"
    );
    let bRightMouthCornerRightMiddleLip = new Bone(
      rightMouthCorner,
      rightMiddleLip,
      this,
      "face"
    );
    let bRightMiddleLipRightUpperLipBottom1 = new Bone(
      rightMiddleLip,
      rightUpperLipBottom1,
      this,
      "face"
    );
    let bRightUpperLipBottom1UpperLipBototmMid = new Bone(
      rightUpperLipBottom1,
      upperLipBottomMid,
      this,
      "face"
    );
    let bLeftMiddleLipLeftLowerLipTop0 = new Bone(
      leftMiddleLip,
      leftLowerLipTop0,
      this,
      "face"
    );
    let bLeftLowerLipTop0LowerLipTopMid = new Bone(
      leftLowerLipTop0,
      lowerLipTopMid,
      this,
      "face"
    );
    let bRightMiddleLipRightLowerLipTop0 = new Bone(
      rightMiddleLip,
      rightLowerLipTop0,
      this,
      "face"
    );
    let bRightLowerLipTop0LowerLipTopMid = new Bone(
      rightLowerLipTop0,
      lowerLipTopMid,
      this,
      "face"
    );
    let bLeftMouthCornerLeftLowerLipBottom0 = new Bone(
      leftMouthCorner,
      leftLowerLipBottom0,
      this,
      "face"
    );
    let bLeftLowerLipBottom0LeftLowerLipBottom1 = new Bone(
      leftLowerLipBottom0,
      leftLowerLipBottom1,
      this,
      "face"
    );
    let bLeftLowerLipBottom1LowerLipBottomMid = new Bone(
      leftLowerLipBottom1,
      lowerLipBottomMid,
      this,
      "face"
    );
    let bRightMouthCornerRightLowerLipBottom0 = new Bone(
      rightMouthCorner,
      rightLowerLipBottom0,
      this,
      "face"
    );
    let bRightLowerLipBottom0RightLowerLipBottom1 = new Bone(
      rightLowerLipBottom0,
      rightLowerLipBottom1,
      this,
      "face"
    );
    let bRightLowerLipBottom1LowerLipBottomMid = new Bone(
      rightLowerLipBottom1,
      lowerLipBottomMid,
      this,
      "face"
    );

    this.faceBones = [
      // Face
      bTopMidRightTop0,
      bRightTop0RightTop1,
      bTopMidLeftTop0,
      bLeftTop0LeftTop1,
      bLeftTop1LeftJaw2,
      bLeftJaw2LeftJaw3,
      bLeftJaw3LeftJaw4,
      bLeftJaw4LeftJaw5,
      bLeftJaw5LeftJaw6,
      bLeftJaw6LeftJaw7,
      bLeftJaw7JawMid,
      bRightTop1RightJaw2,
      bRightJaw2RightJaw3,
      bRightJaw3RightJaw4,
      bRightJaw4RightJaw5,
      bRightJaw5RightJaw6,
      bRightJaw6RightJaw7,
      bRightJaw7JawMid,
      bLeftEye0LeftEye1,
      bLeftEye1LeftEye2,
      bLeftEye2LeftEye3,
      bLeftEye3LeftEye4,
      bLeftEye4LeftEye5,
      bLeftEye5LeftEye0,
      bRightEye0RightEye1,
      bRightEye1RightEye2,
      bRightEye2RightEye3,
      bRightEye3RightEye4,
      bRightEye4RightEye5,
      bRightEye5RightEye0,
      bLeftBrow0LeftBrow1,
      bLeftBrow1LeftBrow2,
      bLeftBrow2LeftBrow3,
      bLeftBrow3LeftBrow4,
      bRightBrow0RightBrow1,
      bRightBrow1RightBrow2,
      bRightBrow2RightBrow3,
      bRightBrow3RightBrow4,
      bNose0Nose1,
      bNose1Nose2,
      bNose2Nose3,
      bNose3Nose4,
      bLeftNose0LeftNose1,
      bLeftNose1Nose4,
      bRightNose0RightNose1,
      bRightNose1Nose4,
      bLeftMouthCornerLeftUpperLipTop0,
      bLeftUpperLipTop0LeftUpperLipTop1,
      bLeftUpperLipTop1UpperLipTopMid,
      bRigthMouthCornerRigthUpperLipTop0,
      bRigthUpperLipTop0RigthUpperLipTop1,
      bRigthUpperLipTop1UpperLipTopMid,
      bLeftMouthCornerLeftMiddleLip,
      bLeftMiddleLipLeftUpperLipBottom1,
      bLeftUpperLipBottom1UpperLipBottomMid,
      bRightMouthCornerRightMiddleLip,
      bRightMiddleLipRightUpperLipBottom1,
      bRightUpperLipBottom1UpperLipBototmMid,
      bLeftMiddleLipLeftLowerLipTop0,
      bLeftLowerLipTop0LowerLipTopMid,
      bRightMiddleLipRightLowerLipTop0,
      bRightLowerLipTop0LowerLipTopMid,
      bLeftMouthCornerLeftLowerLipBottom0,
      bLeftLowerLipBottom0LeftLowerLipBottom1,
      bLeftLowerLipBottom1LowerLipBottomMid,
      bRightMouthCornerRightLowerLipBottom0,
      bRightLowerLipBottom0RightLowerLipBottom1,
      bRightLowerLipBottom1LowerLipBottomMid,
    ];
    this.bodyBones = [
      // Body
      bLeftShoulderRightShoulder,
      bRightShoulderRightHip,
      bLeftHipRightHip,
      bLeftShoulderLeftHip,
      bLeftShoulderLeftElbow,
      bLeftElbowLeftWrist,
      bRightShoulderRightElbow,
      bRightElbowRightWrist,
      bLeftHipLeftKnee,
      bLeftKneeLeftAnkle,
      bRightHipRightKnee,
      bRightKneeRightAnkle,
    ];
    this.bones = this.faceBones.concat(this.bodyBones);
    this.secondaryBones = [];
    this.parts = {};
    this.bodyLen0 = this.getTotalBoneLength(this.bodyBones);
    this.faceLen0 = this.getTotalBoneLength(this.faceBones);

    this.boneGroups = {
      torso: [
        bLeftShoulderRightShoulder,
        bRightShoulderRightHip,
        bLeftHipRightHip,
        bLeftShoulderLeftHip,
      ],
      leftLeg: [bLeftHipLeftKnee, bLeftKneeLeftAnkle],
      rightLeg: [bRightHipRightKnee, bRightKneeRightAnkle],
      leftArm: [bLeftShoulderLeftElbow, bLeftElbowLeftWrist],
      rightArm: [bRightElbowRightWrist, bRightShoulderRightElbow],
      face: this.faceBones,
    };

    this.faceBones.forEach((bone) => {
      let parts = [bone.kp0, bone.kp1];
      parts.forEach((part) => {
        part.baseTransFunc = MathUtils.getTransformFunc(
          bLeftJaw2LeftJaw3.kp0.position,
          bRightJaw2RightJaw3.kp0.position,
          part.position
        );
      });
    });

    this.bNose3Nose4 = bNose3Nose4;
  }

  update(pose: Pose, face: FaceFrame) {
    if (pose.score < MIN_POSE_SCORE) {
      this.isValid = false;
      return;
    }

    this.isValid = this.updatePoseParts(pose);
    if (!this.isValid) return;

    this.isValid = this.updateFaceParts(face);
    if (!this.isValid) return;

    // Update bones.
    this.bones.forEach((bone) => {
      let part0 = this.parts[bone.kp0.name];
      let part1 = this.parts[bone.kp1.name];
      bone.kp0.currentPosition = part0.position;
      bone.kp1.currentPosition = part1.position;
      bone.score = (part0.score + part1.score) / 2;
      bone.latestCenter = bone.kp1.currentPosition
        .add(bone.kp0.currentPosition)
        .divide(2);
    });
    // Update secondary bones.
    let nosePos = this.bNose3Nose4.kp1.currentPosition;
    this.secondaryBones.forEach((bone) => {
      bone.kp0.currentPosition = bone.kp0.transformFunc(
        bone.parent?.kp0.currentPosition,
        nosePos
      );
      bone.kp1.currentPosition = bone.kp1.transformFunc(
        bone.parent?.kp1.currentPosition,
        nosePos
      );
      bone.score = bone.parent?.score;
      bone.latestCenter = bone.kp1.currentPosition
        .add(bone.kp0.currentPosition)
        .divide(2);
    });
    // Recompute face & body bone scale.
    this.currentFaceScale =
      this.getTotalBoneLength(this.faceBones) / this.faceLen0;
    this.currentBodyScale =
      this.getTotalBoneLength(this.bodyBones) / this.bodyLen0;
    this.isValid = true;
  }

  updatePoseParts(pose: Pose) {
    posePartNames.forEach((partName) => {
      // Use new and old pose's confidence scores as weights to compute the new part position.
      let part1 = getPartFromPose(pose, partName);
      let part0 = this.parts[partName] || part1;

      if (!(part0 && part1)) {
        console.log("An updatePoseParts subfunction was missing parts");
        return false;
      }

      let weight0 = part0.score / (part1.score + part0.score);
      let weight1 = part1.score / (part1.score + part0.score);
      let pos = part0.position
        .multiply(weight0)
        .add(part1.position.multiply(weight1));
      this.parts[partName] = {
        position: pos,
        score: part0.score * weight0 + part1.score * weight1,
      };
    });

    let leftHip = this.parts["leftHip"];
    let rightHip = this.parts["rightHip"];

    let kneeDistance = 100;
    let ankleDistance = 100;

    this.parts["leftKnee"] = {
      position: leftHip.position.clone().add(new paper.Point(0, kneeDistance)),
      score: leftHip.score,
    };

    this.parts["leftAnkle"] = {
      position: leftHip.position
        .clone()
        .add(new paper.Point(0, kneeDistance + ankleDistance)),
      score: leftHip.score,
    };

    this.parts["rightKnee"] = {
      position: rightHip.position.clone().add(new paper.Point(0, kneeDistance)),
      score: rightHip.score,
    };

    this.parts["rightAnkle"] = {
      position: rightHip.position
        .clone()
        .add(new paper.Point(0, kneeDistance + ankleDistance)),
      score: rightHip.score,
    };

    if (!this.parts["rightEar"] || !this.parts["leftEar"]) {
      return false;
    }
    return true;
  }

  updateFaceParts(face: FaceFrame) {
    let posLeftEar = this.parts["leftEar"].position;
    let posRightEar = this.parts["rightEar"].position;
    if (
      face &&
      face.positions &&
      face.positions.length &&
      face.faceInViewConfidence > MIN_FACE_SCORE
    ) {
      // Valid face results.
      for (let i = 0; i < facePartNames.length; i++) {
        let partName = facePartNames[i];
        let pos = getKeypointFromFaceFrame(face, i);
        if (!pos) continue;
        this.parts[partName] = {
          position: pos,
          score: face.faceInViewConfidence,
        };
      }
      // Keep track of the transformation from pose ear positions to face ear positions.
      // This can be used to infer face position when face tracking is lost.
      this.leftEarP2FFunc = MathUtils.getTransformFunc(
        posLeftEar,
        posRightEar,
        this.parts["leftJaw2"].position
      );
      this.rightEarP2FFunc = MathUtils.getTransformFunc(
        posLeftEar,
        posRightEar,
        this.parts["rightJaw2"].position
      );
    } else {
      // Invalid face keypoints. Infer face keypoints from pose.
      let fLeftEar = this.leftEarP2FFunc
        ? this.leftEarP2FFunc(posLeftEar, posRightEar)
        : posLeftEar;
      let fRightEar = this.rightEarP2FFunc
        ? this.rightEarP2FFunc(posLeftEar, posRightEar)
        : posRightEar;
      // Also infer face scale from pose.
      this.currentFaceScale = this.currentBodyScale;
      this.faceBones.forEach((bone) => {
        let parts = [bone.kp0, bone.kp1];
        parts.forEach((part) => {
          let position = part.baseTransFunc
            ? part.baseTransFunc(fLeftEar, fRightEar)
            : part.currentPosition;
          this.parts[part.name] = {
            position,
            score: 1,
          };
        });
      });
    }
    return true;
  }

  findBoneGroup(point: paper.Point): Bone[] {
    let minDistances: { [boneKey: string]: number } = {};
    Object.keys(this.boneGroups).forEach((boneGroupKey) => {
      let minDistance = Infinity;
      let boneGroup = this.boneGroups[boneGroupKey];
      boneGroup.forEach((bone) => {
        let d = MathUtils.getClosestPointOnSegment(
          bone.kp0.position,
          bone.kp1.position,
          point
        ).getDistance(point);
        minDistance = Math.min(minDistance, d);
      });
      minDistances[boneGroupKey] = minDistance;
    });
    let minDistance = Math.min(...Object.values(minDistances));
    let selectedGroups: Bone[][] = [];
    Object.keys(minDistances).forEach((key) => {
      let distance = minDistances[key];
      if (distance <= minDistance) {
        selectedGroups.push(this.boneGroups[key]);
      }
    });
    return selectedGroups.flat();
  }

  getTotalBoneLength(bones: Bone[]): number {
    let totalLen = 0;
    bones.forEach((bone) => {
      let d = (bone.kp0.currentPosition || bone.kp0.position).subtract(
        bone.kp1.currentPosition || bone.kp1.position
      );
      totalLen += d.length;
    });
    return totalLen;
  }

  debugDraw(scope: paper.PaperScope) {
    let group = new scope.Group();
    scope.project.activeLayer.addChild(group);
    this.bones.forEach((bone) => {
      let path = new scope.Path({
        segments: [bone.kp0.currentPosition, bone.kp1.currentPosition],
        strokeWidth: 2,
        strokeColor: bone.boneColor,
      });
      group.addChild(path);
    });
    // this.secondaryBones.forEach(bone => {
    //     let path = new scope.Path({
    //         segments: [bone.kp0.currentPosition, bone.kp1.currentPosition],
    //         strokeColor: '#00ff00',
    //         strokeWidth: 5,
    //     });
    //     group.addChild(path);
    // });
  }

  debugDrawLabels(scope: paper.PaperScope) {
    let group = new scope.Group();
    scope.project.activeLayer.addChild(group);
    this.bones.forEach((bone) => {
      let addLabel = (kp: BonePoint, name: string) => {
        let text = new scope.PointText({
          point: [kp.currentPosition.x, kp.currentPosition.y],
          content: name,
          fillColor: "black",
          fontSize: 7,
        });
        group.addChild(text);
      };
      addLabel(bone.kp0, bone.kp0.name);
      addLabel(bone.kp1, bone.kp1.name);
    });
  }

  static getCurrentPosition(segment: Skinning) {
    let position = new paper.Point(0, 0); // 0s not necessary, TS definitions error
    Object.keys(segment.skinning).forEach((boneName) => {
      let bt = segment.skinning[boneName];
      position = position.add(
        (bt.bone.transform(bt.transform) as any).multiply(bt.weight)
      );
    });
    return position;
  }

  static flipPose(pose: Pose) {
    pose.keypoints.forEach((kp) => {
      if (kp.part && kp.part.startsWith("left")) {
        kp.part = "right" + kp.part.substring("left".length, kp.part.length);
      } else if (kp.part && kp.part.startsWith("right")) {
        kp.part = "left" + kp.part.substring("right".length, kp.part.length);
      }
    });
  }

  static flipFace(face: AnnotatedPrediction) {
    Object.keys(facePartName2Index).forEach((partName) => {
      if (partName.startsWith("left")) {
        let rightName =
          "right" + partName.substr("left".length, partName.length);

        //@ts-ignore
        let temp = face.scaledMesh[facePartName2Index[partName]];

        //@ts-ignore
        face.scaledMesh[facePartName2Index[partName]] =
          //@ts-ignore
          face.scaledMesh[facePartName2Index[rightName]];

        //@ts-ignore
        face.scaledMesh[facePartName2Index[rightName]] = temp;
      }
    });
  }

  static getBoundingBox(pose: PoseIllustration) {
    let minX = 100000;
    let maxX = -100000;
    let minY = 100000;
    let maxY = -100000;
    let updateMinMax = (x: number, y: number) => {
      minX = Math.min(x, minX);
      maxX = Math.max(x, maxX);
      minY = Math.min(y, minY);
      maxY = Math.max(y, maxY);
    };
    pose.frames.forEach((frame) => {
      frame.pose.keypoints.forEach((kp) => {
        updateMinMax(kp.position.x, kp.position.y);
      });
      let faceKeypoints = frame.face.positions;
      for (let i = 0; i < faceKeypoints.length; i += 2) {
        updateMinMax(faceKeypoints[i], faceKeypoints[i + 1]);
      }
    });
    return [minX, maxX, minY, maxY];
  }

  static translatePose(pose: PoseIllustration, d: { x: number; y: number }) {
    pose.frames.forEach((frame) => {
      frame.pose.keypoints.forEach((kp) => {
        kp.position.x += d.x;
        kp.position.y += d.y;
      });
      let faceKeypoints = frame.face.positions;
      for (let i = 0; i < faceKeypoints.length; i += 2) {
        faceKeypoints[i] += d.x;
        faceKeypoints[i + 1] += d.y;
      }
    });
  }

  static resizePose(
    pose: PoseIllustration,
    origin: paper.Point,
    scale: { x: number; y: number }
  ) {
    pose.frames.forEach((frame) => {
      frame.pose.keypoints.forEach((kp: BonePoint) => {
        kp.position.x = origin.x + (kp.position.x - origin.x) * scale.x;
        kp.position.y = origin.y + (kp.position.y - origin.y) * scale.y;
      });
      let faceKeypoints = frame.face.positions;
      for (let i = 0; i < faceKeypoints.length; i += 2) {
        faceKeypoints[i] = origin.x + (faceKeypoints[i] - origin.x) * scale.x;
        faceKeypoints[i + 1] =
          origin.y + (faceKeypoints[i + 1] - origin.y) * scale.y;
      }
    });
  }

  static toFaceFrame(faceDetection: AnnotatedPrediction): FaceFrame {
    let frame: FaceFrame = {
      positions: [],
      faceInViewConfidence: faceDetection.faceInViewConfidence,
    };
    for (let i = 0; i < facePartNames.length; i++) {
      let partName = facePartNames[i];

      let p = (faceDetection.scaledMesh as any)[facePartName2Index[partName]];

      frame.positions.push(p[0]);
      frame.positions.push(p[1]);
    }
    return frame;
  }
}
