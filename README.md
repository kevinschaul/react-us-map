# react-us-map

[![NPM](https://img.shields.io/npm/v/react-us-map.svg)](http://npm.im/react-us-map)

 React component for displaying responsive choropleth U.S. maps with tooltips, fills, strokes and more.

Used in The Washington Post’s [abortion legislation tracker](https://www.washingtonpost.com/nation/interactive/2022/abortion-rights-protections-restrictions-tracker/).

![react-us-map-responsive](https://user-images.githubusercontent.com/675639/163626962-e7f76157-4928-4eef-92a2-3dab69a4ca51.png)

## Installation

    npm i --save react-us-map

## Usage

Import `USMap`:

    import { USMap } from 'react-us-map'

Then, in JSX, render the component:

    <USMap 
        fill={d => d === 'Illinois' ? 'steelblue' : '#eee'}
    />

### Props

Control the map styling with props. Most props take a function with the full state name as the only argument.

View full list of props and some examples on [Storybook](https://www.kschaul.com/react-us-map/?path=/docs/usmap--default-story).

## Development

To contribute to this tool, first checkout the code. Then install the dependencies:

    npm i

To start storybook:

    npm run start

To release a new version:

    npm version [major | minor | patch]

    npm run release
