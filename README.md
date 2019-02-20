# My Web Components collection

[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)

A collection of Web Components, to (… compose insightful web apps).

## Status

Work-in-progress.

## Setup

    $ npm run bootstrap

## Demos

Start the local HTTP dev server and visit http://localhost:8081/demos/:

    $ npm run dev

---

## About the Web Components starter

Use this mono-repository as a _starting project template_, to create, publish on NPM and maintain a _collection_ of Web Components.

Every web component is in its own package in the [`packages/`](packages/) folder and the [`demos/`](demos/) folder contain example usage of each of them; or of the components together.

### Usage

Clone this repository and bootstrap the project as mentioned above.

### Features

* Uses [Lerna](https://lernajs.io) to manage the multiple packages;
* [Lit-Element](https://lit-element.polymer-project.org) as the base class to create your Web Components;
* and [Polyserve](https://github.com/Polymer/tools/tree/master/packages/polyserve) as the local development HTTP server.

### Design notes

We wanted a _quite minimal_ starter template, that would allow us to 1. create a collection of Web Components; 2. test & exercise & refine them with examples; 3. and easily publish them on NPM.

This template was inspired by [@material-components/material-components-web-Components](https://github.com/material-components/material-components-web-components) monorepo.

It can/should be extended with a custom build and your preferred testing toolchain — have a look at [@PolymerLabs/start-lit-element](https://github.com/PolymerLabs/start-lit-element) for a custom build; and [@material-components/material-components-web-Components](https://github.com/material-components/material-components-web-components) for examples and inspiration for tests and an evolved build pipeline.