import paper from "paper";
import { setUpPosenet, updatePeer, SkeletonDrawData } from "./posenet";
import {
  broadcastToPeers,
  registerAsClient,
  ReceivedDataHandler,
  ReceivedStreamHandler,
} from "./networking";

let mediaStream: MediaStream | undefined;

const receivedData: ReceivedDataHandler = (peerId: string, data: string) => {
  //console.log(`Received data from ${peerId}`, data);
  const newData: SkeletonDrawData = JSON.parse(data);
  const skeletonDiff: Partial<SkeletonDrawData> = {};

  //console.log("Received data", newData);

  if (!newData.skeleton) {
    console.log("Bad data");
    return;
  }

  skeletonDiff.skeleton = newData.skeleton;

  // By default, paper.Point objects get serialized as arrays of [TypeString, X, Y]
  if (newData.position) {
    skeletonDiff.position = new paper.Point(
      newData.position[1],
      newData.position[2]
    );
  }
  if (newData.destination) {
    skeletonDiff.destination = new paper.Point(
      newData.destination[1],
      newData.destination[2]
    );
  }

  updatePeer(peerId, skeletonDiff);
};

const receivedStream: ReceivedStreamHandler = (
  peerId: string,
  stream: MediaStream
) => {
  const audio = document.createElement("audio");
  audio.id = `audio-${peerId}`;
  audio.srcObject = stream;
  audio.play();
};

const getMediaStream = async (): Promise<MediaStream | undefined> => {
  console.log("Getting media stream");
  if (mediaStream) {
    return mediaStream;
  }

  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user" },
    });

    const video: HTMLVideoElement = document.querySelector("#webcam");
    video.srcObject = stream;
    video.onloadedmetadata = async (e) => {
      video.play();

      await setUpPosenet({
        input: video,
        output: document.querySelector("#illustration"),
        onSkeletonUpdate: (drawData) => {
          delete drawData.illustration;
          const json = JSON.stringify(drawData);
          broadcastToPeers(json);
        },
      });

      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      registerAsClient(audioStream, { receivedData, receivedStream });
    };
  } catch (err) {
    console.log("Video error", err);
    /* handle the error */
  }

  mediaStream = stream;

  return stream;
};

window.addEventListener("DOMContentLoaded", () => {
  getMediaStream();
});
