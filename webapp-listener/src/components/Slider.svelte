<script lang="ts">
  export let range: [number, number] = [0, 100];
  export let step: number | null = null;
  export let orientation: "horizontal" | "vertical" = "horizontal";

  export let value: number;

  let rect: HTMLElement;
  const trackValue = (ev: MouseEvent) => {
    const bbox = rect.getBoundingClientRect();
    const { bboxLow, bboxLength, currPos } =
      orientation === "horizontal"
        ? {
            bboxLow: bbox.left,
            bboxLength: bbox.width,
            currPos: ev.clientX,
          }
        : {
            bboxLow: -bbox.bottom,
            bboxLength: bbox.height,
            currPos: -ev.clientY,
          };
    let relativePos = (currPos - bboxLow) / bboxLength;
    // clamp relative pos to [0,1.0]
    relativePos = Math.min(Math.max(relativePos, 0.0), 1.0);
    const sharpValue = range[0] + (range[1] - range[0]) * relativePos;
    // round value to nearest step if needed
    value =
      step === null
        ? sharpValue
        : step * Math.floor((sharpValue + 0.5 * step) / step);
  };

  const draggable = (node: HTMLElement) => {
    let dragging: boolean = false;
    const onMouseDown = () => {
      dragging = true;
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };
    const onMouseMove = (ev: MouseEvent) => {
      if (dragging) trackValue(ev);
    };
    const onMouseUp = (ev: MouseEvent) => {
      if (dragging) trackValue(ev);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    node.addEventListener("mousedown", onMouseDown);

    return {
      destroy() {
        node.removeEventListener("mousedown", onMouseDown);
      },
    };
  };

  $: relativeVal = (value - range[0]) / (range[1] - range[0]);
  $: selectedStyle =
    orientation === "horizontal"
      ? `left: 0; width: ${relativeVal * 100}%`
      : `top: ${(1 - relativeVal) * 100}%; height: ${relativeVal * 100}%`;
  $: grabStyle =
    orientation === "horizontal"
      ? `left: calc(-.8em + ${relativeVal * 100}%)`
      : `top: calc(-.8em + ${(1 - relativeVal) * 100}%)`;
</script>

<style>
  .slider {
    background: transparent;
    border-radius: 1.6em;
  }

  .slider.horizontal {
    padding: 1em 1.6em;
  }

  .slider.vertical {
    padding: 1.6em 1em;
  }

  .slider-rect {
    position: relative;
    background: transparent;
    background: lightgray;
    border-radius: 0.8em;
  }

  .horizontal > .slider-rect {
    height: 0.8em;
  }

  .vertical > .slider-rect {
    width: 0.8em;
    height: 10em;
  }

  .slider-grab {
    position: absolute;
    height: 1.6em;
    width: 1.6em;
    top: -0.4em;
    left: -0.4em;
    border-radius: 50%;
    box-shadow: 0 0 0.2em darkgray;
    background: white;
    cursor: pointer;
  }

  .slider-selected {
    position: relative;
    height: 0.8em;
    background: lightblue;
    border-radius: 0.8em;
  }
</style>

<div class="slider {orientation}" bind:this={rect}>
  <div class="slider-rect" on:click|preventDefault={trackValue}>
    <div class="slider-selected" style={selectedStyle} />
    <div class="slider-grab" style={grabStyle} use:draggable />
  </div>
</div>
