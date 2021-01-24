<script lang="ts">
  import { onMount } from "svelte";
  import { settings } from "../settings";

  export let analyserNode: AnalyserNode | null;
  export let flipType: "flip" | "rotate" | "jump" = "rotate";

  const LOWPASS_CUTOFF_IDX = 6;
  const RUNNING_AVE = 0.97;

  let canvas: HTMLCanvasElement;
  let beatCanvas: HTMLCanvasElement;
  let bufferLength = analyserNode
    ? analyserNode.frequencyBinCount
    : settings.FFT_SIZE / 2;
  let dataArray = new Uint8Array(bufferLength);

  let clientWidth = 500;
  let clientHeight = 100;

  let flipped = true;
  onMount(() => {
    const ctx = canvas.getContext("2d");
    const beatCtx = beatCanvas.getContext("2d");
    if (ctx === null || beatCtx === null) {
      console.error("failed to initialize canvas context");
      return;
    }
    let canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    let beatAve = 0;
    let frame = requestAnimationFrame(draw);
    let lastFlip: DOMHighResTimeStamp = 0;
    function draw(t: DOMHighResTimeStamp) {
      frame = requestAnimationFrame(draw);
      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
      }
      if (ctx && canvas) {
        canvas.width = clientWidth;
        canvasWidth = canvas.width;
        ctx.fillStyle = "white";
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        let barWidth = canvasWidth / (bufferLength * 2) - 3;

        for (let i = 0; i < bufferLength; i++) {
          const xRight =
            canvasWidth / 2 + (barWidth + 2) * i - (barWidth + 2) / 2;
          const barHeight = (dataArray[i] * canvasHeight) / 255;
          ctx.fillRect(xRight, canvasHeight - barHeight, barWidth, barHeight);
          const xLeft =
            canvasWidth / 2 - (barWidth + 2) * i - (barWidth + 2) / 2;
          ctx.fillRect(xLeft, canvasHeight - barHeight, barWidth, barHeight);
        }
      }
      if (beatCtx && beatCanvas) {
        const canFlip = t > lastFlip + 200;
        if (flipType === "rotate" || flipType === "jump") {
          if (canFlip) flipped = false;
        }
        beatCanvas.width = clientWidth;
        const lowpass = new Uint8Array(dataArray.slice(0, LOWPASS_CUTOFF_IDX));
        const lowpassSignalNorm =
          lowpass.reduce((a, b) => a + b) / (255 * LOWPASS_CUTOFF_IDX);
        let isBeat: boolean = false;
        if (lowpassSignalNorm > beatAve) {
          if (lowpassSignalNorm > beatAve * 1.005) {
            isBeat = true;
            // limit flipping
            if (t > lastFlip + 200) {
              if (flipType === "rotate" || flipType === "jump") {
                flipped = true;
              } else {
                flipped = !flipped;
              }
              lastFlip = t;
            }
          }
          beatAve = lowpassSignalNorm;
        } else {
          beatAve =
            RUNNING_AVE * beatAve + (1 - RUNNING_AVE) * lowpassSignalNorm;
        }

        beatCtx.clearRect(0, 0, beatCtx.canvas.width, beatCtx.canvas.height);
        if (isBeat) {
          beatCtx.fillStyle = "red";
          beatCtx.fillRect(0, 0, beatCtx.canvas.width, beatCtx.canvas.height);
        }
        let barWidth = 20;
        let barHeight = lowpassSignalNorm * beatCtx.canvas.height;
        beatCtx.fillStyle = "white";
        beatCtx.fillRect(
          0,
          beatCtx.canvas.height - barHeight,
          barWidth,
          barHeight
        );
        beatCtx.fillRect(
          barWidth + 1,
          beatCtx.canvas.height - beatAve * beatCtx.canvas.height,
          barWidth,
          beatAve * beatCtx.canvas.height
        );
      }
    }
  });

  $: imgClass = (() => {
    switch (flipType) {
      case "flip": {
        return flipped ? "flipped" : "normal";
      }
      case "rotate": {
        return flipped ? "rotated" : "base";
      }
      case "jump": {
        return flipped ? "jumping" : "notjumping";
      }
    }
  })();
</script>

<div class="container" bind:clientWidth>
  <canvas bind:this={canvas} width={clientWidth / 2} height={clientHeight} />
</div>
<!-- <canvas bind:this={beatCanvas} width={clientWidth} /> -->
<img
  src="/nito.png"
  class={imgClass}
  alt="Nitocris tries to dance to the beat"
/>

<style>
  .container {
    width: 100%;
  }

  img.normal {
    transform: scaleX(1);
    transition: transform 200ms;
  }

  img.flipped {
    transform: scaleX(-1);
    transition: transform 200ms;
  }

  img.rotated {
    transform: rotate(360deg);
    transition: transform 200ms;
  }

  img.jumping {
    transform: translateY(-30px);
  }

  img.notjumping {
    transform: none;
    transition: transform 100ms;
  }
</style>
