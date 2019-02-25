import {LitElement, html, css } from 'https://unpkg.com/lit-element@2.0.1/lit-element.js?module'


/**
 * A simple force directed graph component that positions
 * its given children in a 2D plan using 3D.js.
 *
 * Example of usage:
 *
 * ```
 * <d3-force-graph>
 *   <svg slot="nodes">
 *     <circle id=1 r=10></circle>
 *     <circle id=2 r=10></circle>
 *     ...
 *   </svg>
 *   <svg slot="links">
 *     <link source=1 target=2></link>
 *   </svg>
 * </d3-force-graph>
 * ```
 *
 * Or using HTML elements
 *
 * ```
 * <d3-force-graph>
 *   <div slot="nodes">
 *    <input id=1 type=text></input>
 *    <video id=2 src='...'></video>
 *     ...
 *   </svg>
 *   <svg slot="links">
 *     <link source=1 target=2></link>
 *   </svg>
 * </d3-force-graph>
 * ```
 *
 *
 * SOURCES:
 *  - [Understanding the Force by Shirley Wu](https://medium.com/@sxywu/understanding-the-force-ef1237017d5)
 *
 *
 * 2019-02-18 Issue with slots and SVG:
 *
 *    It seems that it's not possible to have `<svg><slot></slot></svg>`
 *    because the `slot` element is not a SVG element.  2019-02-18: Justin
 *    Fagiani recommended to use a <foreignObject> but this is not working
 *    since we want to use.  I am finally passing the <svg> element with its
 *    children
 *
 * Author: Yves Lange / github.com/yveslange
 *
 */
class D3ForceGraph extends LitElement {
  static get properties() {
    return {
      /**
       * The maximum radius number for any kind of element (used by the collide
       * system).
       */
      maxRadius: {
        type: Number,
        attribute: "max-radius"
      },

      /** A general X offset for the position of the link (target and source). */
      linkOffsetX: {
        type: Number,
        attribute: "link-offset-x"
      },

      /** A general Y offset for the position of the link (target and source). */
      linkOffsetY: {
        type: Number,
        attribute: "link-offset-y",
      },

      /** The default color of the links. */
      linkStroke: {
        type: String,
        attribute: "link-stroke"
      },

      /** The default width of the links. */
      linkStrokeWidth: {
        type: Number,
        attribute: "link-stroke-width"
      },

      /**
       * The attraction (positive number) or repulsion (negative number) force
       * between charges.
       */
      chargeForce: {
        type: Number,
        attribute: "charge-force"
      },

      /** The applied X force. */
      forceX: {
        type: Number,
        attribute: "force-x"
      },

      /** The applied Y force. */
      forceY: {
        type: Number,
        attribute: "force-y"
      },

      /** The force of the collision between the nodes. */
      collisionForce: {
        type: Number,
        attribute: "collision-force"
      }
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        position: relative;
        height: 100%;
        width: 100%;
      }
      ::slotted([slot=links]) {
        position: absolute;
        z-index: -1;
        top: 0;
      }
    `;
  }

  constructor(){
    super();
    this.linkOffsetX = 0;
    this.linkOffsetY = 0;
    this.linkStroke = "black";
    this.linkStrokeWidth = 1;
    this.maxRadius = 90;
    this.chargeForce = -10;
    this.forceX = 1/20;
    this.forceY = 1/20;
    this.collisionForce = 0.05;
  }

  render() {
    return html`
      <slot name="nodes"></slot>
      <slot name="links"></svg>
    `
  }

  firstUpdated() {
    this.width = this.offsetWidth;
    this.height = this.offsetHeight;
    this.start();
  }

  /**
   * Start the simulation of the force directed graph
   *
   * 1. Iterates over the `nodes` and `links` slots
   * 2. Create the `this.nodesData` and `this.linksData` structures (mainly where the positions will be stored by the simulation).
   * 3. Sets the forces of the simulation
   * 4. Updates the positions of each nodes and links using D3.js (on each tick of the simulation)
   *
   * The data can be accessed using the `nodesData` and/or `linksData` properties
   * Also, this component will trigger the `tick` event on each update.
   *
   * The simulation can be restarted using the `reset()` public method.
   * This method can be used after having added a new node or link.
   *
   * EVENTS
   * - tick: `detail: {nodesData: ..., linksData: ...}`
   *
   */
  start(){
    var ROOTS = Array.from(this.children);

    // Return an error if more than one root exits
    if(ROOTS.length > 2){ throw new Error("The force directed graph does not accept more than two \"roots\" element (slots are: 'nodes' and 'links')")}
    if(ROOTS.length == 0){ return; }

    // Retrieve the SVG container of the nodes and its nodes elements
    const nodesSlot = ROOTS.find((el) => {
      if(!el.assignedSlot) throw new Error("The element should be attached either to the 'nodes' or the 'links' slot");
      return el.assignedSlot.name == "nodes";
    });
    const nodes = nodesSlot ? Array.from(nodesSlot.children) : [];

    // Creates the set of nodes for D3
    var nodesData = nodes.map( (el) => {
      return this.prepareNodeData(el);
    })

    // Retrieve the SVG container of the links and its links elements
    const linksSlot = ROOTS.find( (el) => {
      return el.assignedSlot.name == "links";
    });
    const links = linksSlot ? Array.from(linksSlot.children) : [];

    // Creates the set of links for D3
    var linksData = links.map( (el) => {
      return this.prepareLinkData(el);
    });

    // Sets the local variables
    this.nodesData = nodesData;
    this.linksData = linksData;

    this.initD3(nodesSlot, nodes, linksSlot, links, this.nodesData, this.linksData);
  }

  initD3(nodesSlot, nodes, linksSlot, links, nodesData, linksData){
    // Some initial variables
    var d3 = window.d3;

    var nodeName = nodesSlot.children[0].nodeName;
    var isSVG = nodesSlot.nodeName == "svg";

    // For each datum, creates a new object using an existing object as the
    // prototype of the newly created object.
    linksData = linksData.map(d => Object.create(d));
    nodesData = nodesData.map(d => Object.create(d));

    const simulation = this._simulation =
      d3.forceSimulation(nodesData)
      /*The simulation’s internal timer stops when the current alpha is less than the minimum alpha. The default alpha decay rate of ~0.0228 corresponds to 300 iterations.*/
        .force("link", d3.forceLink(linksData).id(d => d.id))
        .force("charge", d3.forceManyBody()
          .strength(this.chargeForce)
      )
      .force("center", d3.forceCenter(this.width/2, this.height/2))
      .force("x", d3.forceX()
        .strength(this.forceX)
      )
      .force("y", d3.forceY()
        .strength(this.forceY)
      )
      .force("collision", d3.forceCollide()
        // The collision 'strength' will define how fast and how far the charges
        // will be ejected.
        .strength(this.collisionForce)
        // The radius defines how big are the collides
        .radius( (d) => {
          if(isSVG){
            let radius = parseFloat(d.DOM.getAttribute("r") || 0)+1;
            let computedStyle = getComputedStyle(d.DOM); // Needed to get the value if defined in CSS stylesheet
            let strokeWidth = parseFloat(d.DOM.style.strokeWidth) || parseFloat(computedStyle.strokeWidth)
            return radius + strokeWidth;
          } else {
            var radius =  parseInt(getComputedStyle(d.DOM).width) || 20;
            return Math.min(radius, this.maxRadius);
          }
        })
      )


    var node = d3.select(nodesSlot)
      .attr("viewBox", [0, 0, this.width, this.height])
      .attr("width", this.width)
      .attr("height", this.height)
      .selectAll("*")
      .data(nodesData)
        .attr("title", (d) => d.id)
        .call(this.drag(simulation));

    if(linksSlot.nodeName != 'svg'){
      throw new Error("The links slot element should always be a `<svg>`");
    }
    var link = d3.select(linksSlot)
      .attr("viewBox", [0, 0, this.width, this.height])
      .attr("width", this.width)
      .attr("height", this.height)
      .selectAll("line")
      .data(linksData)
        .attr("stroke", (d) => d.dom.getAttribute("stroke") || this.linkStroke)
        .attr("stroke-width", (d) => d.dom.getAttribute("stroke-width") || this.linkStrokeWidth)
        .attr("title", (d) => d.source.id+" "+d.target.id)


    // create and dispatch the event that can be used to analyze the data
    var event = new CustomEvent("tick", {
      detail: {
        nodesData: this.nodesData,
        linksData: this.linksData
      }
    });

    simulation.on("tick", () => {
      if(link){
        link
          .attr("x1", d => {
            var offset = parseFloat(d.dom.getAttribute("source-x-offset")) || 0
            return d.source.x + offset + this.linkOffsetX + 1
          })
          .attr("y1", d => {
            var offset = parseFloat(d.dom.getAttribute("source-y-offset")) || 0
            return d.source.y + offset + this.linkOffsetY + 1
          })
          .attr("x2", d => {
            var offset = parseFloat(d.dom.getAttribute("target-x-offset")) || 0
            return d.target.x + offset + this.linkOffsetX + 1
          })
          .attr("y2", d => {
            var offset = parseFloat(d.dom.getAttribute("target-y-offset")) || 0
            return d.target.y + offset + this.linkOffsetY + 1
          })

          this.dispatchEvent(event);
      }

      /*
       */
      if(nodeName == 'circle') {
        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);
      }
      else {
        node.attr("style", d => `position: absolute; left: ${d.x}px; top: ${d.y}px;`)
      }
    });
  }

  /** The dragging function for the simulation */
  drag(simulation) {
    var d3 = window.d3;
    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.01).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  prepareNodeData(el) {
    return {
      cx: 0,
      cy: 0,
      top: 0,
      left: 0,
      id: el.getAttribute("id"),
      group: el.getAttribute("group"),
      DOM: el
    }
  }
  prepareLinkData(el) {
    return {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      source: el.getAttribute("source"),
      target: el.getAttribute("target"),
      dom: el,
    }
  }

  reset() {
    this.start();
  }

}

customElements.define('d3-force-graph', D3ForceGraph);
