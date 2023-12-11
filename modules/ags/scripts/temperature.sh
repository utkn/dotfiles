#! /bin/bash

sensors -j 2> /dev/null | jq --arg s $2 '.[$s] | .["Composite"] | .["temp1_input"]'
