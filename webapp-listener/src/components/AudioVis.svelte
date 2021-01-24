<script lang="ts">
  import { beforeUpdate, onMount } from "svelte";
  import { settings } from "../settings";
  import { getRandomInt } from "../actions/util";

  export let analyserNode: AnalyserNode | null;
  let flipType: "flip" | "rotate" | "jump" = "rotate";

  const LOWPASS_CUTOFF_IDX = 6;
  const RUNNING_AVE = 0.97;

  let canvas: HTMLCanvasElement;
  let bufferLength = analyserNode
    ? analyserNode.frequencyBinCount
    : settings.FFT_SIZE / 2;
  let dataArray = new Uint8Array(bufferLength);

  let clientWidth = 500;
  let clientHeight = 100;

  let flipped = true;
  let danceHidden = false;
  let danceColor = "hsl(10, 80%, 80%)";
  onMount(() => {
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
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
      if (!danceHidden) {
        const canFlip = t > lastFlip + 200;
        if (flipType === "rotate" || flipType === "jump") {
          if (canFlip) flipped = false;
        }
        const lowpass = new Uint8Array(dataArray.slice(0, LOWPASS_CUTOFF_IDX));
        const lowpassSignalNorm =
          lowpass.reduce((a, b) => a + b) / (255 * LOWPASS_CUTOFF_IDX);
        let isBeat: boolean = false;
        if (lowpassSignalNorm > beatAve) {
          if (lowpassSignalNorm > beatAve * 1.005) {
            isBeat = true;
            danceColor = `hsl(${getRandomInt(0, 360)}, 80%, 80%)`;
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
      }
    }

    return () => {
      cancelAnimationFrame(frame);
    };
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

  const flipTypeOptionMap = new Map([
    ["rotate", "rotate 🔃️"],
    ["flip", "flip ↔️"],
    ["jump", "jump ↕️"],
  ]);
</script>

<div class="vis-container" bind:clientWidth>
  <canvas bind:this={canvas} width={clientWidth / 2} height={clientHeight} />
</div>

<div class="dance">
  <div class="dance-controls">
    {#if !danceHidden}
      {#each ["rotate", "flip", "jump"] as flipTypeOption}
        <button
          class={`flip-${flipTypeOption}`}
          disabled={flipTypeOption === flipType}
          on:click|preventDefault={() => {
            // @ts-ignore: flipTypeOption must be a valid flip type
            flipType = flipTypeOption;
          }}>
          {flipTypeOptionMap.get(flipTypeOption)}
        </button>
      {/each}
    {/if}
    <button
      class="dance-visible"
      on:click|preventDefault={() => {
        danceHidden = !danceHidden;
      }}>
      {#if danceHidden}
        🔥🔥 PADORU PADORU 🔥🔥
      {:else}
        hide padoru 😢
      {/if}
    </button>
  </div>
  <div
    class="img-container"
    style="background-color: {danceColor}; transition: background-color 1s ease;"
  >
    <img
      src="/nito.png"
      class="dance-img {imgClass} {danceHidden ? 'hide' : ''}"
      alt="Nitocris tries to dance to the beat"
    />
  </div>
</div>

<style>
  .container {
    width: 100%;
  }

  .dance {
    position: absolute;
    bottom: 0;
    right: 0;
    background-color: white;
    margin-right: 20px;
    border: solid rgb(8, 110, 157);
    border-width: 0 2px;
  }

  .dance-controls {
    background: rgb(8, 110, 157);
  }

  .dance-controls button {
    background: rgb(8, 110, 157);
    border: none;
    border-radius: 0;
    color: white;
    margin: 0;
  }

  .dance-controls button:disabled {
    background: rgb(4, 83, 119);
  }

  .dance-controls button:hover {
    cursor: pointer;
  }

  .dance-visible {
    float: right;
  }

  .img-container {
    overflow: hidden;
  }

  .dance-img {
    padding: 20px;
    width: min(90%, 440px);
  }

  .hide {
    display: none;
  }

  .dance-img.normal {
    transform: scaleX(1);
    transition: transform 200ms;
  }

  .dance-img.flipped {
    transform: scaleX(-1);
    transition: transform 200ms;
  }

  .dance-img.rotated {
    transform: rotate(360deg);
    transition: transform 200ms linear;
  }

  .dance-img.jumping {
    transform: translateY(-30px);
    transition: transform 20ms;
  }

  .dance-img.notjumping {
    transform: none;
    transition: transform 100ms;
  }
</style>
