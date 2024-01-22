#!/bin/bash

# Fetch the validators and store in a variable
validators=$(curl -s https://beefy.rotko.net/api)

# Check if the curl command was successful
if [ $? -eq 0 ]; then
    # Iterate over each validator
    echo "$validators" | jq -c '.candidates1kv[]' | while read -r validator; do
        # Extract fields with error checking
        name=$(echo $validator | jq -r '.name // "unknown"')
        address=$(echo $validator | jq -r '.address // "unknown"')
        matrix_address=$(echo $validator | jq -r '.matrix // "unknown"')

        # Construct and display the message
        if [ "$name" != "unknown" ] && [ "$address" != "unknown" ] && [ "$matrix_address" != "unknown" ]; then
            message="Hey $matrix_address! Your validator node - $name with the address $address is still using [dummy keys](https://kusama-staging.w3f.community/validators/beefy/dummy) for beefy set by fellowship. Please rotate your keys and set them onchain. Thanks heaps for your support securing the network!"
            echo $message
            matrix-commander --credentials ~/.config/matrix-commander/hitchhooker.json --room "$matrix_address" --message "$message"
        else
            echo "Incomplete data for validator: $validator"
        fi

        sleep 30
    done
else
    echo "Failed to fetch validator data"
fi
