import React, { useEffect, useRef } from 'react'
import PropTypes from 'prop-types';

import { withSize } from 'react-sizeme'
import { select } from 'd3-selection'
import { geoPath, geoAlbersUsa } from 'd3-geo'
import { feature } from 'topojson'

const fullToPostal = require('us-abbreviations')('full', 'postal')
const topoStates = require('../../data/us-10m.v2.json')
const stateGeoData = feature(topoStates, topoStates.objects['states'])
const mapLabels = require('../../data/map-labels.json')
const mapLabelAdjustmentsByState = mapLabels.adjustments.reduce((p, v) => {
  p[v.state] = v
  return p
}, {})

function slugify(s) {
  // https://gist.github.com/mathewbyrne/1280286
  return s.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '')            // Trim - from end of text
}

function selectOrAppend(parent, selector, d3Element) {
  const selection = parent.select(selector);
  if (selection.size()) {
    return selection;
  } else {
    return parent.append(d3Element);
  }
}

const nop = stateName => null

/**
 * React component that draws a responsive svg map of U.S. states, with
 * optional tooltips and styling applied
 */
const USMap = props => {
  const {
    size,
    excludeDC,
    sort,
    fill,
    fillHover,
    stroke,
    strokeHover,
    strokeWidth,
    strokeWidthHover,
    overstroke,
    overstrokeWidth,
    textFilter,
    textFontSize,
    textFontFamily,
    textFontWeight,
    textFill,
    textStroke,
    textStrokeWidth,
    textBackgroundFill,
    textBackgroundWidth,
    textBackgroundHeight,
    textBackgroundDY,
    tooltipWidth,
    tooltipHTML
  } = props

  const isSkinny = size.width <= 700

  const d3Chart = useRef(null)

  const margins = {
    top: 0,
    bottom: 0,
    left: 0,
    right: isSkinny ? 34 : 0,
  }

  const offshoreData = excludeDC ?
    mapLabels.offshore.filter(d => d.state !== 'District of Columbia') :
    mapLabels.offshore

  useEffect(() => {
    const el = d3Chart.current

    const width = size.width - margins.left - margins.right
    const height = width * 0.58

    const offshoreBoxWidth = isSkinny ? 12 : 15
    const fontSize = isSkinny ? textFontSize[0] : textFontSize[1]

    const svg = select(el)
    svg.html('')
    svg
      .attr('height', height + margins.top + margins.bottom)
      .attr('width', width + margins.right + margins.left)

    const tooltip = selectOrAppend(select('body'), '.d3-map-tooltip', 'div')
      .attr('class', 'd3-map-tooltip')
      .style('position', 'absolute')
      .style('opacity', 0)
      .style('width', tooltipWidth + 'px')

    const mouseover = (e, d) => {
      tooltip
        .style('visibility', 'visible')
        .style('opacity', 1)

      tooltip.html(tooltipHTML(d))

      svg.selectAll(`.d3-state-${slugify(d)}`)
        .style('fill', d => fillHover(d.properties.name))
        .style('stroke', d => strokeHover(d.properties.name))
        .style('stroke-width', d => strokeWidthHover(d.properties.name))
        .raise()

      svg.selectAll(`.d3-state-offshore-${slugify(d)}`)
        .style('fill', d => fillHover(d.state))
        .style('stroke', d => strokeHover(d.state))
        .style('stroke-width', d => strokeWidthHover(d.state))
    }

    const mousemove = (e, d) => {
      tooltip
        .style('left',
          e.pageX > width * 0.75
            ? e.pageX - tooltipWidth + 'px'
            : e.pageX + 10 + 'px'
        )
        .style('top', e.pageY + 10 + 'px')
    }

    const mouseout = (e, d) => {
      tooltip
        .style('opacity', 0)
        .style('visibility', 'hidden')

      svg.selectAll(`.d3-state-${slugify(d)}`)
        .style('fill', d => fill(d.properties.name))
        .style('stroke', d => stroke(d.properties.name))
        .style('stroke-width', d => strokeWidth(d.properties.name))
      // TODO .lower() but only sometimes, depending on sort

      svg.selectAll(`.d3-state-offshore-${slugify(d)}`)
        .style('fill', d => fill(d.state))
        .style('stroke', d => stroke(d.state))
        .style('stroke-width', d => strokeWidth(d.state))
    }

    const projection = geoAlbersUsa()
      .fitSize([width, height], stateGeoData)

    const path = geoPath().projection(projection)

    const g = svg
      .append('g')
      .attr('class', 'map')

    const states = g
      .append('g')
      .attr('class', 'states')
      .selectAll('.state')
      .data(stateGeoData.features.sort((a, b) => {
        return sort(a.properties.name, b.properties.name)
      }))
      .enter()
      .append('path')
      .attr('d', path)
      .attr('class', d => `state d3-state-${slugify(d.properties.name)}`)
      .attr('fill', d => fill(d.properties.name))
      .attr('stroke', d => stroke(d.properties.name))
      .attr('stroke-width', d => strokeWidth(d.properties.name))
      .raise()

    if (tooltipHTML !== nop) {
      states
        .on('mouseover', (e, d) => mouseover(e, d.properties.name))
        .on('mousemove', (e, d) => mousemove(e, d.properties.name))
        .on('mouseout', (e, d) => mouseout(e, d.properties.name))
    }

    if (overstroke !== nop) {
      g
        .append('g')
        .attr('class', 'states-overstrokes')
        .selectAll('.state-overstroke')
        .data(stateGeoData.features.sort(sort))
        .enter()
        .append('path')
        .attr('d', path)
        .attr('class', d => `state-overstroke d3-state-${slugify(d.properties.name)}`)
        .attr('fill', 'none')
        .attr('stroke', d => overstroke(d.properties.name))
        .attr('stroke-width', d => overstrokeWidth(d.properties.name))
        .raise()
    }

    const statesLabeledOffshore = mapLabels.offshore.map(d => d.state)

    if (textBackgroundFill !== nop) {
      g
        .append('g')
        .attr('class', 'state-labels-backgrounds')
        .selectAll('.state-label-background')
        .data(stateGeoData.features.filter(d => {
          return !statesLabeledOffshore.includes(d.properties.name) && textFilter(d.properties.name)
        }))
        .enter()
        .append('rect')
        .attr('class', 'state-label-background')
        .attr('x', d => {
          const adjustment = mapLabelAdjustmentsByState[d.properties.name][isSkinny ? 'mobile_label_adj_x' : 'label_adj_x']
          return path.centroid(d)[0] + adjustment - textBackgroundWidth(d.properties.name)/2
        })
        .attr('y', d => {
          const adjustment = mapLabelAdjustmentsByState[d.properties.name][isSkinny ? 'mobile_label_adj_y' : 'label_adj_y']
          return path.centroid(d)[1] + adjustment - textBackgroundHeight(d.properties.name)/2 + textBackgroundDY(d.properties.name)
        })
        .attr('width', d => textBackgroundWidth(d.properties.name))
        .attr('height', d => textBackgroundHeight(d.properties.name))
        .style('fill', d => textBackgroundFill(d.properties.name))
    }

    const stateLabels = g
      .append('g')
      .attr('class', 'state-labels')
      .selectAll('.state-label')
      .data(stateGeoData.features.filter(d => {
        return !statesLabeledOffshore.includes(d.properties.name) && textFilter(d.properties.name)
      }))
      .enter()
      .append('text')
      .attr('class', 'state-label')
      .attr('x', d => {
        const adjustment = mapLabelAdjustmentsByState[d.properties.name][isSkinny ? 'mobile_label_adj_x' : 'label_adj_x']
        return path.centroid(d)[0] + adjustment
      })
      .attr('y', d => {
        const adjustment = mapLabelAdjustmentsByState[d.properties.name][isSkinny ? 'mobile_label_adj_y' : 'label_adj_y']
        return path.centroid(d)[1] + adjustment
      })
      .style('text-anchor', 'middle')
      .style('font-size', fontSize)
      .style('font-family', d => textFontFamily(d.properties.name))
      .style('font-weight', d => textFontWeight(d.properties.name))
      .style('paint-order', 'stroke')
      .style('pointer-events', 'none')
      .text(d => fullToPostal(d.properties.name))

    // Don't apply fill or strokes to Hawaii since its label is not over the state
    stateLabels.filter(d => d.properties.name !== 'Hawaii')
      .style('fill', d => textFill(d.properties.name))
      .style('stroke', d => textStroke(d.properties.name))
      .style('stroke-width', d => textStrokeWidth(d.properties.name))

    const statesOffshore = g
      .append('g')
      .attr('class', 'states-offshore')

    const offshoreRightData = isSkinny ? (
      offshoreData
    ) : (
      offshoreData.filter(d => d.region === 'right')
    )
    const offshoreTopData = isSkinny ? (
      []
    ) : (
      offshoreData.filter(d => d.region === 'top')
    )

    const statesOffshoreRight = statesOffshore
      .selectAll('.state-offshore-right')
      .data(offshoreRightData)
      .enter()
      .append('g')
      .attr('class', 'state-offshore state-offshore-right')
      .attr('transform', (d, i) => `translate(${isSkinny ? width : (width - 60)}, ${(isSkinny ? 15 : height * 0.35) + (i * (offshoreBoxWidth + 5))})`)

    const statesOffshoreRightRect = statesOffshoreRight
      .append('rect')
      .attr('class', d => `d3-state-offshore-${slugify(d.state)}`)
      .attr('x', 0)
      .attr('width', offshoreBoxWidth)
      .attr('y', 0)
      .attr('height', offshoreBoxWidth)
      .style('fill', d => fill(d.state))
      .style('stroke', d => stroke(d.state))
      .style('stroke-width', d => strokeWidth(d.state))

    if (tooltipHTML !== nop) {
      statesOffshoreRightRect
        .on('mouseover', (e, d) => mouseover(e, d.state))
        .on('mousemove', (e, d) => mousemove(e, d.state))
        .on('mouseout', (e, d) => mouseout(e, d.state))
    }

    if (textBackgroundFill !== nop) {
      statesOffshoreRight
        .append('rect')
        .attr('x', offshoreBoxWidth + 2)
        .attr('y', d => offshoreBoxWidth - 2 - textBackgroundHeight(d.state)/2 + textBackgroundDY(d.state))
        .attr('width', d => textBackgroundWidth(d.state))
        .attr('height', d => textBackgroundHeight(d.state))
        .style('fill', d => textBackgroundFill(d.state))
    }

    statesOffshoreRight
      .append('text')
      .attr('x', offshoreBoxWidth + 4)
      .attr('y', offshoreBoxWidth - 2)
      .style('font-size', fontSize)
      .style('font-family', d => textFontFamily(d.state))
      .style('font-weight', d => textFontWeight(d.state))
      .text(d => fullToPostal(d.state))

    const statesOffshoreTop = statesOffshore
      .selectAll('.state-offshore-top')
      .data(offshoreTopData)
      .enter()
      .append('g')
      .attr('class', 'state-offshore state-offshore-top')
      .attr('transform', (d, i) => `translate(${width * 0.85}, ${(height * 0.07) + (i * (offshoreBoxWidth + 5))})`)

    const statesOffshoreTopRect = statesOffshoreTop
      .append('rect')
      .attr('class', d => `d3-state-offshore-${slugify(d.state)}`)
      .attr('x', 0)
      .attr('width', offshoreBoxWidth)
      .attr('y', 0)
      .attr('height', offshoreBoxWidth)
      .attr('fill', d => fill(d.state))
      .attr('stroke', d => stroke(d.state))
      .attr('stroke-width', d => strokeWidth(d.state))

    if (tooltipHTML !== nop) {
      statesOffshoreTopRect
        .on('mouseover', (e, d) => mouseover(e, d.state))
        .on('mousemove', (e, d) => mousemove(e, d.state))
        .on('mouseout', (e, d) => mouseout(e, d.state))
    }

    statesOffshoreTop
      .append('text')
      .attr('x', offshoreBoxWidth + 4)
      .attr('y', offshoreBoxWidth - 2)
      .style('font-size', fontSize)
      .style('font-family', d => textFontFamily(d.state))
      .style('font-weight', d => textFontWeight(d.state))
      .text(d => fullToPostal(d.state))

  }, [d3Chart, size.width, sort, fill, stroke, strokeWidth, margins.left, margins.right, margins.top, margins.bottom, isSkinny, tooltipWidth, textFontSize, textFontFamily, textFontWeight, textFill, textStroke, offshoreData, tooltipHTML, fillHover, strokeHover, strokeWidthHover, textStrokeWidth, textFilter])

  return (
    <div>
      <svg
        ref={d3Chart}
        width={'100%'}
        height={'100%'}
      />
    </div>
  )
}

USMap.propTypes = {
  /**
   * A function that returns a fill color for the state shape.
   */
  fill: PropTypes.func,

  /**
   * A function that returns a fill color for the state shape when it is hovered
   * over. Only applies if `tooltipHTML` is defined.
   */
  fillHover: PropTypes.func,

  /**
   * A function that returns a stroke color for the state shape.
   */
  stroke: PropTypes.func,

  /**
   * A function that returns a stroke color for the state shape when it is
   * hovered over. Only applies if `tooltipHTML` is defined.
   */
  strokeHover: PropTypes.func,

  /**
   * A function that returns a stroke width for the state shape.
   */
  strokeWidth: PropTypes.func,

  /**
   * A function that returns a stroke width for the state shape when it is
   * hovered over. Only applies if `tooltipHTML` is defined.
   */
  strokeWidthHover: PropTypes.func,

  /**
   * A function that returns an additional stroke color for the state shape,
   * which can be used to create a stroked casing effect.
   */
  overstroke: PropTypes.func,

  /**
   * A function that returns an additional stroke width for the state shape,
   * which can be used to create a stroked casing effect.
   */
  overstrokeWidth: PropTypes.func,

  /**
   * A function that returns whether to show a text label for this state. Does
   * not affect offshore state box labels, which are always shown.
   */
  textFilter: PropTypes.func,

  /**
   * An array with two font size values for state labels: One at small sizes
   * and another at large sizes.
   */
  textFontSize: PropTypes.array,

  /**
   * A function that returns the font family for the given state label.
   */
  textFontFamily: PropTypes.func,

  /**
   * A function that returns the font weight for the given state label.
   */
  textFontWeight: PropTypes.func,

  /**
   * A function that returns a fill color for the state label.
   */
  textFill: PropTypes.func,

  /**
   * A function that returns a stroke color for the state label.
   */
  textStroke: PropTypes.func,

  /**
   * A function that returns a stroke width for the state label.
   */
  textStrokeWidth: PropTypes.func,

  /**
   * A function that returns a color for a rectangle to appear behind the state
   * label.
   */
  textBackgroundFill: PropTypes.func,

  /**
   * A function that returns a width for a rectangle to appear behind the state
   * label.
   */
  textBackgroundWidth: PropTypes.func,

  /**
   * A function that returns a height for a rectangle to appear behind the state
   * label.
   */
  textBackgroundHeight: PropTypes.func,

  /**
   * A function that returns a value to nudge up or down a rectangle that
   * appears behind the state label.
   */
  textBackgroundDY: PropTypes.func,

  /**
   * A width in pixels for the tooltip. Only applies if `tooltipHTML` is
   * defined.
   */
  tooltipWidth: PropTypes.number,


  /**
   * A function that returns HTML to show in a tooltip. You will likely want to
   * style this div with a white background and border.
   */
  tooltipHTML: PropTypes.func,

  /**
   * A comparator function to control what order the states are drawn in.
   * Useful when you want to control which strokes appear above others.
   * @param a
   * @param b
   */
  sort: PropTypes.func,

  /**
   * Whether to exclude an offshore box for Washington, D.C.
   */
  excludeDC: PropTypes.bool,
}

USMap.defaultProps = {
  excludeDC: false,
  sort: nop,
  fill: stateName => '#eee',
  fillHover: nop,
  stroke: stateName => "#aaa",
  strokeHover: nop,
  strokeWidth: stateName => 1,
  strokeWidthHover: nop,
  overstroke: nop,
  overstrokeWidth: nop,
  textFilter: stateName => true,
  textFontSize: ['12px', '14px'],
  textFontFamily: stateName => 'sans-serif',
  textFontWeight: nop,
  textFill: nop,
  textStroke: nop,
  textStrokeWidth: nop,
  textBackgroundFill: nop,
  textBackgroundWidth: nop,
  textBackgroundHeight: nop,
  textBackgroundDY: nop,
  tooltipWidth: 200,
  tooltipHTML: nop,
  size: { width: 600 }
}

export default withSize()(USMap)
export { USMap as USMapUnwrapped }