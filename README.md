# IS4302 Project

## Requirement

Node JS Version: `v20.6.0`

## Installation

### Install nvm and NodeJS v20.6.0

1. It is recommended to use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to install Node JS, as it allows different versions of node. (For windows, please use [nvm-windows](https://github.com/coreybutler/nvm-windows).)

2. Run `nvm -v`, it should show the nvm version installed if everything is done correctly.

3. Run `nvm install v20.6.0`, wait for the command to finish, it could take a while. Afterwards, run `nvm version` or `node -v`, it should show `v20.6.0` if everything is done correctly.

### Install Project Dependencies

1. Run `npm install`. Afterwards, run `npm test`, it should execute successfully.

### Some Tips

1. Add below to VS Code workspace settings, it helps with formatting solidity code.

    ```json
    "[solidity]": {
        "editor.formatOnSave": true
    }
    ```

2. Install any one of the 2 VS Code extensions. (Don't install both, as they conflict with each other)
    - [solidity by Juan Blanco](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity) (I used this one though)
    - [solidity by Nomic Foundation](https://marketplace.visualstudio.com/items?itemName=NomicFoundation.hardhat-solidity)

## Reference

- [nvm installation guide](https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/)