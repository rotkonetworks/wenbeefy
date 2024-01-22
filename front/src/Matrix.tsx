import { createSignal, onCleanup, onMount } from 'solid-js';

const MatrixRain = () => {
  let canvas;
  const chars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍKSM'.split('');
  const fontSize = 20;
  const color = '#ce206e';
  let animationFrameId;

  // Initialize signals with default values
  const [width, setWidth] = createSignal(0);
  const [height, setHeight] = createSignal(0);

  onMount(() => {
    // Update width and height with window dimensions
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);

    // Update canvas dimensions
    canvas.width = width();
    canvas.height = height();

    // Initialize drops array based on the width
    const cols = () => Math.round(width() / fontSize);
    let drops = Array(cols()).fill(0);

    const ctx = canvas.getContext('2d');
    let frameCount = 0;
    const updateInterval = 2; // Update every 5 frames

    const randomClearInterval = () => Math.floor(Math.random() * 50) + 50; // Clear at random intervals between 50 and 100 frames

    let clearAtFrame = randomClearInterval(); // Decide the next frame to clear the canvas completely


    const draw = () => {
      if (frameCount >= clearAtFrame) {
        // Occasionally clear the canvas completely
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        clearAtFrame = frameCount + randomClearInterval(); // Schedule the next clear
      } else {
        // Regular fading
        ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.fillStyle = color;
      ctx.font = `${fontSize}px arial`;

      for (let i = 0; i < drops.length; i++) {
        // Randomly choose an update interval between 2 and 4 for each drop
        const updateInterval = Math.floor(Math.random() * 3) + 2; // Generates 2, 3, or 4

        if (frameCount % updateInterval === 0) {
          const text = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
      }
      frameCount++;
      animationFrameId = requestAnimationFrame(draw);

    };

    animationFrameId = requestAnimationFrame(draw);

    const resize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
      canvas.width = width();
      canvas.height = height();
      drops = Array(cols()).fill(0);
    };

    window.addEventListener('resize', resize);
    onCleanup(() => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    });
  });

  return (
    <canvas
      class="bg-black fixed z--1 inset-0"
      ref={el => { canvas = el; }}
      width={width()}
      height={height()}
    >
      Your browser does not support the canvas element.
    </canvas>
  );
};

export default MatrixRain;
