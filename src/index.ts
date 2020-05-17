import Peer from "peerjs";

let peer: Peer;

const getMediaStream = async (): Promise<MediaStream | undefined> => {
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "user" },
    });

    const video: HTMLVideoElement = document.querySelector("#webcam");
    video.srcObject = stream;
    video.onloadedmetadata = (e) => {
      video.play();
    };
  } catch (err) {
    /* handle the error */
  }

  return stream;
};

const connectionOpened = (conn: Peer.DataConnection) => {
  conn.on("open", () => {
    console.log(`connected to ${conn.peer}`);
    conn.send("Hello!");
  });

  conn.on("data", (data) => {
    console.log("Reeived data", data);
  });
};

const callOpened = (call: Peer.MediaConnection) => {
  call.on("stream", (stream) => {});
};

window.addEventListener("DOMContentLoaded", () => {
  peer = new Peer();
  console.log("Loaded!");
  peer.on("open", (id) => {
    console.log("Peer opened");
    console.log(id);
  });

  peer.on("connection", connectionOpened);
  peer.on("call", async (call) => {
    const mediaStream = await getMediaStream();
    call.answer(mediaStream);
  });

  document.getElementById("connect").addEventListener("click", () => {
    const otherId = prompt("What's the peer ID?");
    const conn = peer.connect(otherId);
    connectionOpened(conn);
  });

  document.getElementById("call").addEventListener("click", async () => {
    const otherId = prompt("What's the peer ID?");
    const mediaStream = await getMediaStream();
    const conn = peer.call(otherId, mediaStream);
    callOpened(conn);
  });
});
