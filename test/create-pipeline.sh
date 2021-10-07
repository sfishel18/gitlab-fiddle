#!/bin/bash

yaml="${1:-test-one.yml}"

json_body="{ \"yaml\": $(jq -R -s '.' < test/pipelines/$yaml) }"

curl -X POST "http://localhost:3000/pipeline" -H 'Content-Type: application/json' -d "$json_body"