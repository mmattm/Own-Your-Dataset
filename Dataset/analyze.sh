#!/bin/bash
set -euo pipefail

API_KEY="${OPENAI_API_KEY:-}"

if [[ -z "$API_KEY" ]]; then
  echo "❌ OPENAI_API_KEY manquant. Ex: export OPENAI_API_KEY='...'"
  exit 1
fi

MODEL="gpt-5-mini"
INPUT_DIR="./output"
SYSTEM_PROMPT_FILE="system_prompt.txt"

FINAL_JSON="../public/dataset.json"
TMP_JSON="dataset.tmp"

# Read system prompt as JSON string (quoted) for safe embedding
SYSTEM_PROMPT_JSON=$(jq -Rs . < "$SYSTEM_PROMPT_FILE")

# Start JSON array
echo "[" > "$TMP_JSON"
first_entry=true

shopt -s nullglob
for img in "$INPUT_DIR"/*; do
  [[ -f "$img" ]] || continue
  filename=$(basename "$img")


  # --- Get TRUE image dimensions (from the actual file you send) ---
  read IMG_W IMG_H <<< "$(identify -format "%w %h" -auto-orient "$img")"
  echo "Analyzing: $filename (${IMG_W}x${IMG_H})"


  # Resize en mémoire → base64
  IMAGE_DATA="$(magick "$img" -resize 1280x1280\> -auto-orient jpg:- | base64 | tr -d '\n')"
  MIME_TYPE="image/jpeg"

  # Dimensions après resize
  read IMG_W IMG_H <<< "$(magick "$img" -resize 1280x1280\> -auto-orient -format "%w %h" info:)"

  # --- Build request body with Structured Outputs (text.format) ---
  BODY=$(jq -n \
    --arg model "$MODEL" \
    --arg sysPrompt "$SYSTEM_PROMPT_JSON" \
    --arg imgdata "$IMAGE_DATA" \
    --arg mime "$MIME_TYPE" \
    --arg filename "$filename" \
    --arg w "$IMG_W" \
    --arg h "$IMG_H" '
{
  model: $model,

  "text": {
    "format": {
      "type": "json_schema",
      "name": "VisualAnalysisSchema",
      "strict": true,
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "title": { "type": "string" },
          "filename": { "type": "string" },
          "description": { "type": "string" },
          "dominant_color_hex": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
          "horizon_y": { "type": "integer", "minimum": 0 },
          "objects": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "label": { "type": "string" },
                "bounding_box": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "x": { "type": "integer" },
                    "y": { "type": "integer" },
                    "width": { "type": "integer" },
                    "height": { "type": "integer" }
                  },
                  "required": ["x","y","width","height"]
                }
              },
              "required": ["label","bounding_box"]
            }
          },

          # "areas_6x6": {
          #   "type": "array",
          #   "minItems": 36,
          #   "maxItems": 36,
          #   "items": {
          #     "type": "object",
          #     "additionalProperties": false,
          #     "properties": {
          #       "hex": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
          #       "keyword": { "type": "string" }
          #     },
          #     "required": ["hex","keyword"]
          #   }
          # }
        },
        #"required": ["title","filename","description","dominant_color_hex","horizon_y","objects","areas_6x6"]
        "required": ["title","filename","description","dominant_color_hex","horizon_y","objects"]
      }
    }
  },

  input: [
    {
      role: "system",
      content: [
        { type: "input_text", text: ($sysPrompt | fromjson) }
      ]
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: ("FILENAME: " + $filename + "\nIMAGE_WIDTH: " + $w + "\nIMAGE_HEIGHT: " + $h)
        },
        {
          type: "input_image",
          image_url: ("data:" + $mime + ";base64," + $imgdata)
        }
      ]
    }
  ]
}')

  response="$(curl -sS https://api.openai.com/v1/responses \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$BODY")"

  # Extract output text (varies slightly; keep fallback)
  raw_json=$(echo "$response" | jq -r '.output[] | select(.type=="message") | .content[0].text')

  if [[ -z "$raw_json" ]]; then
    echo "❌ ERROR: JSON manquant pour $filename"
    echo "$response" | jq .
    rm -f "$TMP_JSON"
    exit 1
  fi

  # Add width/height/orientation to the parsed JSON
  parsed_json="$(echo "$raw_json" | jq -c \
    --arg w "$IMG_W" \
    --arg h "$IMG_H" \
    '
    .width = ($w|tonumber)
    | .height = ($h|tonumber)
    | .orientation = (
        if ($w|tonumber) > ($h|tonumber) then "landscape"
        elif ($h|tonumber) > ($w|tonumber) then "portrait"
        else "square"
        end
      )
    ')"

  # Append to array
  if [[ "$first_entry" == true ]]; then
    first_entry=false
  else
    echo "," >> "$TMP_JSON"
  fi
  echo "$parsed_json" >> "$TMP_JSON"
done

echo "]" >> "$TMP_JSON"
mkdir -p "$(dirname "$FINAL_JSON")"
mv "$TMP_JSON" "$FINAL_JSON"

echo "✅ DONE! dataset saved as $FINAL_JSON"