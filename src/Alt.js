import { SHOW_INFO } from "./main.js";
import { SHOW_BG } from "./main.js";

export class Alt {
  constructor(container, photos) {
    this.container = container;
    this.photos = photos;
    new p5((p) => this.sketch(p), container);
  }

  sketch(p) {
    const c = this.container;
    const imgs = [];
    let alphas = []; // <- opacité par photo
    let imageColors = [];

    p.preload = () => {
      this.photos.forEach((ph) => {
        imgs.push(p.loadImage(`/Dataset/Output/${ph.filename}`));
        imageColors.push(ph.dominant_color_hex);
      });
    };

    p.setup = () => {
      // retina support
      p.pixelDensity(window.devicePixelRatio || 1);
      p.createCanvas(c.clientWidth, c.clientHeight);
      p.textFont("Sohne");

      alphas = new Array(this.photos.length).fill(0);
    };

    p.draw = () => {
      p.background(0);

      for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        const meta = this.photos[i];
        const sun = meta?.objects?.[0]?.bounding_box;

        if (!img || !sun) continue;

        // ---- 1) Ratios ----
        const imgRatio = img.width / img.height;
        const canvasRatio = p.width / p.height;

        let displayW, displayH, dx, dy;

        // ---- 2) Taille affichée + centrage ----
        if (imgRatio > canvasRatio) {
          displayW = p.width;
          displayH = p.width / imgRatio;
          dx = 0;
          dy = (p.height - displayH) / 2;
        } else {
          displayH = p.height;
          displayW = p.height * imgRatio;
          dx = (p.width - displayW) / 2;
          dy = 0;
        }

        // ---- 3) Scale ----
        const scale = displayW / img.width;

        // ---- 4) Position du crop dans le canvas ----
        const destX = dx + sun.x * scale;
        const destY = dy + sun.y * scale;
        const destW = sun.width * scale;
        const destH = sun.height * scale;

        const hovered =
          p.mouseX > destX &&
          p.mouseX < destX + destW &&
          p.mouseY > destY &&
          p.mouseY < destY + destH;

        if (hovered) alphas[i] = 255;

        // ---- Lerp vers 0 (fade out) ----
        alphas[i] = p.lerp(alphas[i], 0, 0.08);

        if (alphas[i] > 1) {
          p.push();

          // crop → canvas
          if (SHOW_BG) {
            p.tint(255, alphas[i]);
            p.image(
              img,
              destX,
              destY,
              destW,
              destH,
              sun.x,
              sun.y,
              sun.width,
              sun.height
            );
          } else {
            p.noStroke();
            const col = p.color(imageColors[i]);
            p.fill(col.levels[0], col.levels[1], col.levels[2], alphas[i]);
            p.rect(destX, destY, destW, destH);
          }

          p.pop();

          // Infos (au hover, ou si tu préfères "tant que alpha>1" enlève hovered)
          if (SHOW_INFO && hovered) {
            p.fill(255);
            p.textSize(32);
            p.textLeading(32);

            const title = meta?.title ?? "";

            const w = destW;
            const h = 80;

            p.text(title, destX, destY + destH + 10, w, h);
          }
        }
      }
    };

    p.windowResized = () => p.resizeCanvas(c.clientWidth, c.clientHeight);
  }
}
