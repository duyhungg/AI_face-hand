import "./App.css";
import { useEffect, useRef, useState } from "react";
import React from "react";
import soundURL from "./assets/canhbao.m4a";
import { Howl } from "howler";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import * as tf from "@tensorflow/tfjs";
import { initNotifications, notify } from "@mycv/f8-notification";
const Not_Touch = "not-touch";
const Touched = "touched";
const Training_Time = 50;
const Touched_Confidents = 0.9;
// hahahahh
// bước 1: train 1 : train cho máy không chạm
// bước 2: train 2 : train cho máy chạm tay
// bước 3: lấy hình ảnh hiện tại phân tích so sánh
// nếu matching thì => cảnh báo
function App() {
  const video = useRef();
  const model = useRef();
  const canPlaySound = useRef(true);
  const classifier = useRef();
  const [touch, setTouch] = useState(false);

  const init = async () => {
    console.log("init");
    await setupCamera();
    console.log("setupCamera");
    classifier.current = knnClassifier.create();

    model.current = await mobilenet.load();

    console.log("setup done");
    initNotifications({ cooldown: 3000 });
  };
  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;
      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          (stream) => {
            video.current.srcObject = stream;
            video.current.addEventListener("loadeddata", resolve);
          },
          (error) => reject(error)
        );
      } else {
        reject();
      }
    });
  };
  const train = async (label) => {
    for (let i = 0; i < Training_Time; ++i) {
      console.log(`progess ${parseInt(((i + 1) / Training_Time) * 100)} %`);
      await training(label);
    }
  };
  const training = (label) => {
    return new Promise(async (resolve) => {
      const embedding = model.current.infer(video.current, true);
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  };
  const run = async () => {
    const embedding = model.current.infer(video.current, true);
    const result = await classifier.current.predictClass(embedding);
    console.log("label :", result.label);
    console.log("Confidents :", result.confidences);

    if (
      result.label === Touched &&
      result.confidences[result.label] > Touched_Confidents
    ) {
      console.log("touched");
      setTouch(true);
      notify("Bỏ tay ra bạn ơi", { body: "Bạn vừa chạm tay vào mặt" });
      if (canPlaySound.current) {
        canPlaySound.current = false;
        sound.play();
      }
    } else {
      console.log("not_touch");
      setTouch(false);
    }
    await sleep(200);
    run();
  };
  const sleep = (ms = 0) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };
  useEffect(() => {
    init();
    sound.on("end", function () {
      canPlaySound.current = true;
    });
    //
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  var sound = new Howl({
    src: [soundURL],
  });

  return (
    <>
      <div className={`main ${touch ? "touched" : ""}`}>
        <video ref={video} className="video" autoPlay />
        <div className="control">
          <button className="btn" onClick={() => train(Not_Touch)}>
            Train 1
          </button>
          <button className="btn" onClick={() => train(Touched)}>
            Train 2
          </button>
          <button className="btn" onClick={() => run()}>
            Run
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
