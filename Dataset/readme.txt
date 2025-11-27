
.env.local
OPENAI_API_KEY="...."

$ export $(grep -v '^#' .env.local | xargs)
$ ./analyze.sh