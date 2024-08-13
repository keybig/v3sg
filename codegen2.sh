#!/bin/bash

set -e
export CANNON_IPFS_URL="https://ipfs.synthetix.io"

codegen() {
  namespace=$1
  chainId=$2
  cannonPackage=$3
  cannonPreset=$4

  echo
  echo
  echo
  echo '>' npx cannon inspect "$cannonPackage" --preset $cannonPreset --chain-id "$chainId" --write-deployments "./$namespace/deployments"
  npx cannon inspect "$cannonPackage" --preset $cannonPreset --chain-id "$chainId" --write-deployments "./$namespace/deployments"

  echo
  echo
  echo
  echo '>' npx graph codegen "subgraph.$namespace.yaml" --output-dir "$namespace/generated"
  npx graph codegen "subgraph.$namespace.yaml" --output-dir "$namespace/generated"
  npx prettier --write "$namespace/generated"

  echo
  echo
  echo
  echo '>' npx graph build "subgraph.$namespace.yaml" --output-dir "./build/$namespace"
  npx graph build "subgraph.$namespace.yaml" --output-dir "./build/$namespace"
  npx prettier --write "subgraph.$namespace.yaml"
}

# releaseVersion=$(npm run --workspace '@synthetixio/perps-market' node -p 'require(`./package.json`).version')
releaseVersion="latest"

# update to add preset to name, "synthetix-omnibus:$releaseVersion@andromeda", preset flag deprecated
codegen base-sepolia-andromeda 84532 "synthetix-omnibus:$releaseVersion@andromeda"
codegen base-mainnet-andromeda 8453 "synthetix-omnibus:$releaseVersion@andromeda"

#codegen mainnet 1 "synthetix-omnibus:$releaseVersion" main
#codegen goerli 5 "synthetix-omnibus:$releaseVersion" main
#codegen optimism-mainnet 10 "synthetix-omnibus:$releaseVersion" main
#codegen optimism-goerli 420 "synthetix-omnibus:$releaseVersion" main
#codegen base-goerli 84531 "synthetix-omnibus:$releaseVersion" main

# Add the following line for Sepolia
# codegen sepolia 11155111 "synthetix-omnibus:$releaseVersion" main


# example cannont
# npx @usecannon/cli inspect synthetix-omnibus@${PRESET} \
#  --write-deployments ./deployments \
# --chain-id ${CHAIN_ID}
