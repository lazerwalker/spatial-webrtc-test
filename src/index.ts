import Peer from "peerjs";
import * as SignalR from "@aspnet/signalr";
import { drawSkeleton, setUpPosenet, parseSVG } from "./posenet";
import { PoseIllustration } from "./illustrationGen/illustration";

let peer: Peer;
let mediaStream: MediaStream | undefined;

let dataConnections: Peer.DataConnection[] = [];
let peerCanvases: { [peerId: string]: PoseIllustration } = {};

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
    video.onloadedmetadata = (e) => {
      video.play();

      setUpPosenet({
        input: video,
        output: document.querySelector("#illustration"),
        onSkeletonUpdate: (skeleton) => {
          const json = JSON.stringify(skeleton);
          dataConnections.forEach((c) => c.send(json));
        },
      });
    };
  } catch (err) {
    console.log("Video error", err);
    /* handle the error */
  }

  mediaStream = stream;

  return stream;
};

const connectionOpened = (conn: Peer.DataConnection) => {
  dataConnections.push(conn);

  conn.on("open", async () => {
    console.log(`connected to ${conn.peer}`);
    const illustration = await parseSVG("boy");
    peerCanvases[conn.peer] = illustration;
  });

  conn.on("data", (data) => {
    const skeleton = JSON.parse(data);
    console.log("Reeived data", skeleton);
    drawSkeleton(skeleton, peerCanvases[conn.peer]);
  });
};

const callOpened = (call: Peer.MediaConnection) => {
  call.on("stream", (stream) => {
    const id = call.peer;

    if (document.getElementById(id)) {
      return;
    }

    const el = document.createElement("video");
    el.id = id;
    el.srcObject = stream;
    el.onloadedmetadata = (e) => {
      el.play();
    };
    document.querySelector("#wrapper").appendChild(el);
  });
};

const connectToPeer = async (peerId: string) => {
  const dataConn = peer.connect(peerId);
  connectionOpened(dataConn);

  // const mediaStream = await getMediaStream();
  // const callConn = peer.call(peerId, mediaStream);
  // callOpened(callConn);
};

const connectSignalR = () => {
  class CustomHttpClient extends SignalR.DefaultHttpClient {
    public send(request: SignalR.HttpRequest): Promise<SignalR.HttpResponse> {
      request.headers = {
        ...request.headers,
        "x-ms-client-principal-id": peer.id,
      };
      return super.send(request);
    }
  }

  const connection = new SignalR.HubConnectionBuilder()
    .withUrl(`https://spatial-webrtc-test.azurewebsites.net/api`, {
      httpClient: new CustomHttpClient(console),
    })
    .configureLogging(SignalR.LogLevel.Information)
    .build();

  connection.on("peerConnected", (peerId) => {
    console.log("got a peer to connect to!", peerId);
    if (peerId !== peer.id) {
      connectToPeer(peerId);
    } else {
      console.log("That was ourself. Ignoring.");
    }
  });

  connection.on("irrelevant", (data) => {
    console.log("Irrelevant", data);
  });

  connection.onclose(() => console.log("disconnected"));

  console.log("connecting...");
  connection
    .start()
    .then(() => console.log("Connected!"))
    .catch(console.error);
};

const setUpPeer = (peer: Peer) => {
  console.log("Peer loaded!");
  peer.on("open", (id) => {
    console.log("Peer opened");
    console.log(id);

    connectSignalR();

    fetch(`https://spatial-webrtc-test.azurewebsites.net/api/broadcastPeerId`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ userId: id }),
    }).then((r) => {
      if (r.ok) {
        console.log("Updated", r);
      } else {
        console.error("Update failed", r);
      }
    });
  });

  peer.on("connection", connectionOpened);
  peer.on("call", async (call) => {
    const mediaStream = await getMediaStream();
    call.answer(mediaStream);
    callOpened(call);
  });
};
window.addEventListener("DOMContentLoaded", () => {
  getMediaStream();
  peer = new Peer();
  setUpPeer(peer);

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
