export class Feed {
  constructor(container, imageSrc, photoMeta = null, index = 0) {
    this.index = index;
    this.imageSrc = imageSrc;
    this.meta = photoMeta;
    new p5((p) => this.sketch(p), container);
  }

  sketch(p) {
    let img, fromColor, toColor;

    let gradients = [["#fff", "#000"]];

    p.preload = () => {
      img = p.loadImage(this.imageSrc);
    };

    p.setup = () => {
      const c = p.createCanvas(img.width, img.height);

      this.isPressed = false;
      c.mousePressed(() => {
        this.isPressed = true;
      });
      c.mouseReleased(() => {
        this.isPressed = false;
      });

      const g = p.random(gradients);
      fromColor = p.color(g[0]);
      toColor = p.color(g[1]);
    };

    p.draw = () => {
      const steps = 12;
      const stepH = p.height / steps;
      p.noStroke();

      // Dégradé
      //let shift = Math.sin(p.frameCount * speed + this.index * 0.5) / 2;
      let shift = 0.5 + ((p.frameCount * 0.005) % 1);
      //let shift = p.map(this.meta?.horizon_y, 0, p.height, 1, 0);

      for (let i = 0; i < steps; i++) {
        let baseT = i / (steps - 1);
        let t = (baseT + shift) % 1;
        p.fill(p.lerpColor(fromColor, toColor, t));
        p.rect(0, i * stepH, p.width, stepH);
      }

      // Position du soleil (bounding box)
      const sun = this.meta?.objects?.[0]?.bounding_box;

      if (sun) {
        p.fill(fromColor);

        const cx = sun.x + sun.width / 2;
        const cy = sun.y + sun.height / 2;

        // alignement du soleil sur la grille
        const snappedY = Math.floor(cy / stepH) * stepH;

        const rawSize = Math.min(sun.width, sun.height) * 0.5;
        const diameter =
          Math.max(stepH, Math.round(rawSize / stepH) * stepH) + stepH;

        p.ellipse(cx, snappedY, diameter, diameter);
      }

      if (this.isPressed) {
        p.image(img, 0, 0);
      }

      // debug horizon ligne rouge
      // p.fill(255, 0, 0);
      // p.rect(0, horizonY, p.width, 10);
    };
  }
}
