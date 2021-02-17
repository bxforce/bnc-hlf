#!/bin/bash

queryCommitted() {
    peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_NAME >&query.txt
    VALUE=$(cat query.txt | grep -o 'Sequence: [0-9]')
    echo "$VALUE"
}

queryCommitted

