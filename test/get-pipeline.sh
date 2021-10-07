#!/bin/bash

ref="${1?id is required}"

curl "http://localhost:3000/pipeline/$ref"