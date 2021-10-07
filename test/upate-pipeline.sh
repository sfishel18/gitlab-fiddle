#!/bin/bash

ref="${1?ref is required}"
yaml="${2:-test-two.yml}"

json_body="{ \"yaml\": $(jq -R -s '.' < test/pipelines/$yaml) }"

curl -X PUT "http://localhost:3000/pipeline/$ref" -H 'Content-Type: application/json' -d "$json_body"