#!/bin/bash

INPUT_DIR="./input"
OUTPUT_DIR="./output"

# Effacer anciennes images
rm -f "$OUTPUT_DIR"/*.jpg
mkdir -p "$OUTPUT_DIR"

counter=1

for img in "$INPUT_DIR"/*; do
  output="$OUTPUT_DIR/${counter}.jpg"

  # Lire dimensions originales
  read W H <<< $(magick identify -format "%w %h" "$img")

  # Ratio cible
  TARGET_W=4
  TARGET_H=3
  TARGET_RATIO=$(echo "$TARGET_W / $TARGET_H" | bc -l)

  # Ratio de l'image
  IMG_RATIO=$(echo "$W / $H" | bc -l)

  # Décider quoi cropper
  if (( $(echo "$IMG_RATIO > $TARGET_RATIO" | bc -l) )); then
    # Image trop large → crop largeur
    NEW_W=$(echo "$H * $TARGET_RATIO" | bc -l)
    NEW_W=${NEW_W%.*} # trim décimal
    NEW_H=$H
  else
    # Image trop haute → crop hauteur
    NEW_H=$(echo "$W / $TARGET_RATIO" | bc -l)
    NEW_H=${NEW_H%.*}
    NEW_W=$W
  fi

  # Crop centré puis resize + compression
  magick "$img" \
    -gravity center \
    -crop "${NEW_W}x${NEW_H}+0+0" +repage \
    -resize 1440x1440\> \
    -quality 85 \
    "$output"

  echo "Processed: #$counter.jpg"
  counter=$((counter + 1))
done

echo "Done! Files saved in $OUTPUT_DIR"