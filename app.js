/*global d3*/
'use strict';

var svg, tooltip, biHiSankey, path, defs, colorScale, highlightColorScale, isTransitioning;

var OPACITY = {
        NODE_DEFAULT: 0.9,
        NODE_FADED: 0.1,
        NODE_HIGHLIGHT: 0.8,
        LINK_DEFAULT: 0.6,
        LINK_FADED: 0.05,
        LINK_HIGHLIGHT: 0.9
    },
    TYPES = ["LEVEL", "GOAL", "DECISION"],
    TYPE_HIGHLIGHT_COLORS = ["#66c2a5", "#fc8d62", "#8da0cb"],
    LINK_COLOR = "#b3b3b3",
    INFLOW_COLOR = "#2E86D1",
    OUTFLOW_COLOR = "#D63028",
    NODE_WIDTH = 36,
    COLLAPSER = {
        RADIUS: NODE_WIDTH / 2,
        SPACING: 2
    },
    OUTER_MARGIN = 5,
    MARGIN = {
        TOP: 2 * (COLLAPSER.RADIUS + OUTER_MARGIN),
        RIGHT: OUTER_MARGIN,
        BOTTOM: OUTER_MARGIN,
        LEFT: OUTER_MARGIN
    },
    TRANSITION_DURATION = 400,
    HEIGHT = 600 - MARGIN.TOP - MARGIN.BOTTOM,
    WIDTH = 1400 - MARGIN.LEFT - MARGIN.RIGHT,
    LAYOUT_INTERATIONS = 1;

// Used when temporarily disabling user interractions to allow animations to complete
var disableUserInterractions = function(time) {
        isTransitioning = true;
        setTimeout(function() {
            isTransitioning = false;
        }, time);
    },

    hideTooltip = function() {
        return tooltip.transition()
            .duration(TRANSITION_DURATION)
            .style("opacity", 0);
    },

    showTooltip = function() {
        return tooltip
            .style("left", d3.event.pageX + "px")
            .style("top", d3.event.pageY + 15 + "px")
            .transition()
            .duration(TRANSITION_DURATION)
            .style("opacity", 1);
    };

colorScale = d3.scale.category10();
highlightColorScale = d3.scale.ordinal().domain(TYPES).range(TYPE_HIGHLIGHT_COLORS);

var background = d3.select("#chart").append("svg");
svg = background
    .attr("width", WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
    .attr("height", HEIGHT + MARGIN.TOP + MARGIN.BOTTOM)
    .append("g")
    .attr("transform", "translate(" + MARGIN.LEFT + "," + MARGIN.TOP + ")");

var viz = svg.append("g")
    .attr("width", "100%")
    .attr("height", "100%");
viz.append("g").attr("id", "links");
viz.append("g").attr("id", "nodes");
svg.append("g").attr("id", "collapsers");

// Add zooming and panning to page
var zoomHandler = function() {
    viz.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
};
var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoomHandler);
zoomListener(background);
background.on("dblclick.zoom", null);

tooltip = d3.select("#chart").append("div").attr("id", "tooltip");

tooltip.style("opacity", 0)
    .append("p")
    .attr("class", "value");

biHiSankey = d3.biHiSankey();

// Set the biHiSankey diagram properties
biHiSankey
    .nodeWidth(NODE_WIDTH)
    .nodeSpacing(2)
    .linkSpacing(2)
    .arrowheadScaleFactor(0.5) // Specifies that 0.5 of the link's stroke WIDTH should be allowed for the marker at the end of the link.
    .size([WIDTH, HEIGHT]);

path = biHiSankey.link().curvature(0.45);

defs = svg.append("defs");

defs.append("marker")
    .style("fill", LINK_COLOR)
    .attr("id", "arrowHead")
    .attr("viewBox", "0 0 6 10")
    .attr("refX", "1")
    .attr("refY", "5")
    .attr("markerUnits", "strokeWidth")
    .attr("markerWidth", "1")
    .attr("markerHeight", "1")
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 L 1 0 L 6 5 L 1 10 L 0 10 z");

defs.append("marker")
    .style("fill", OUTFLOW_COLOR)
    .attr("id", "arrowHeadInflow")
    .attr("viewBox", "0 0 6 10")
    .attr("refX", "1")
    .attr("refY", "5")
    .attr("markerUnits", "strokeWidth")
    .attr("markerWidth", "1")
    .attr("markerHeight", "1")
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 L 1 0 L 6 5 L 1 10 L 0 10 z");

defs.append("marker")
    .style("fill", INFLOW_COLOR)
    .attr("id", "arrowHeadOutlow")
    .attr("viewBox", "0 0 6 10")
    .attr("refX", "1")
    .attr("refY", "5")
    .attr("markerUnits", "strokeWidth")
    .attr("markerWidth", "1")
    .attr("markerHeight", "1")
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 L 1 0 L 6 5 L 1 10 L 0 10 z");

function update() {
    var link, linkEnter, node, nodeEnter, collapser, collapserEnter;

    function dragmove(node) {
        node.x = Math.max(0, Math.min(WIDTH - node.width, d3.event.x));
        node.y = Math.max(0, Math.min(HEIGHT - node.height, d3.event.y));
        node.children.forEach(function(child) {
            child.x = node.x;
        });
        /*jshint validthis:true */
        d3.select(this).attr("transform", "translate(" + node.x + "," + node.y + ")");
        biHiSankey.relayout();
        svg.selectAll(".node").selectAll("rect").attr("height", function(d) {
            return d.height;
        });
        link.attr("d", path);
    }

    function containChildren(node) {
        node.children.forEach(function(child) {
            child.state = "contained";
            child.parent = this;
            child._parent = null;
            containChildren(child);
        }, node);
    }

    function expand(node) {
        node.state = "expanded";
        node.children.forEach(function(child) {
            child.state = "collapsed";
            child._parent = this;
            child.parent = null;
            containChildren(child);
        }, node);
    }

    function collapse(node) {
        node.state = "collapsed";
        containChildren(node);
    }

    function restoreLinksAndNodes() {
        link
            .style("stroke", LINK_COLOR)
            .style("marker-end", function() {
                return 'url(#arrowHead)';
            })
            .transition()
            .duration(TRANSITION_DURATION)
            .style("opacity", OPACITY.LINK_DEFAULT);

        node
            .selectAll("rect")
            .style("fill", function(d) {
                d.color = colorScale(d.type.replace(/ .*/, ""));
                return d.color;
            })
            .style("stroke", function(d) {
                return d3.rgb(colorScale(d.type.replace(/ .*/, ""))).darker(0.1);
            })
            .style("fill-opacity", OPACITY.NODE_DEFAULT);

        node.filter(function(n) {
                return n.state === "collapsed";
            })
            .transition()
            .duration(TRANSITION_DURATION)
            .style("opacity", OPACITY.NODE_DEFAULT);
    }

    function showHideChildren(node) {
        disableUserInterractions(2 * TRANSITION_DURATION);
        hideTooltip();
        if (node.state === "collapsed") {
            expand(node);
        } else {
            collapse(node);
        }

        biHiSankey.relayout();
        update();
        link.attr("d", path);
        restoreLinksAndNodes();
    }

    function highlightConnected(g) {
        link.filter(function(d) {
                return d.source === g;
            })
            .style("marker-end", function() {
                return 'url(#arrowHeadInflow)';
            })
            .style("stroke", OUTFLOW_COLOR)
            .style("opacity", OPACITY.LINK_DEFAULT);

        link.filter(function(d) {
                return d.target === g;
            })
            .style("marker-end", function() {
                return 'url(#arrowHeadOutlow)';
            })
            .style("stroke", INFLOW_COLOR)
            .style("opacity", OPACITY.LINK_DEFAULT);
    }

    function fadeUnconnected(g) {
        link.filter(function(d) {
                return d.source !== g && d.target !== g;
            })
            .style("marker-end", function() {
                return 'url(#arrowHead)';
            })
            .transition()
            .duration(TRANSITION_DURATION)
            .style("opacity", OPACITY.LINK_FADED);

        node.filter(function(d) {
                return (d.name === g.name) ? false : !biHiSankey.connected(d, g);
            }).transition()
            .duration(TRANSITION_DURATION)
            .style("opacity", OPACITY.NODE_FADED);
    }

    link = svg.select("#links").selectAll("path.link")
        .data(biHiSankey.visibleLinks(), function(d) {
            return d.id;
        });

    link.transition()
        .duration(TRANSITION_DURATION)
        .style("stroke-WIDTH", function(d) {
            return Math.max(1, d.thickness);
        })
        .attr("d", path)
        .style("opacity", OPACITY.LINK_DEFAULT);


    link.exit().remove();


    linkEnter = link.enter().append("path")
        .attr("class", "link")
        .style("fill", "none");

    linkEnter.on('mouseenter', function() {
        if (!isTransitioning) {
            d3.select(this)
                .style("stroke", LINK_COLOR)
                .transition()
                .duration(TRANSITION_DURATION / 2)
                .style("opacity", OPACITY.LINK_HIGHLIGHT);
        }
    });

    linkEnter.on('mouseleave', function() {
        if (!isTransitioning) {
            hideTooltip();

            d3.select(this)
                .style("stroke", LINK_COLOR)
                .transition()
                .duration(TRANSITION_DURATION / 2)
                .style("opacity", OPACITY.LINK_DEFAULT);
        }
    });

    linkEnter.sort(function(a, b) {
            return b.thickness - a.thickness;
        })
        .classed("leftToRight", function(d) {
            return d.direction > 0;
        })
        .classed("rightToLeft", function(d) {
            return d.direction < 0;
        })
        .style("marker-end", function() {
            return 'url(#arrowHead)';
        })
        .style("stroke", LINK_COLOR)
        .style("opacity", 0)
        .transition()
        .delay(TRANSITION_DURATION)
        .duration(TRANSITION_DURATION)
        .attr("d", path)
        .style("stroke-WIDTH", function(d) {
            return Math.max(1, d.thickness);
        })
        .style("opacity", OPACITY.LINK_DEFAULT);


    node = svg.select("#nodes").selectAll(".node")
        .data(biHiSankey.collapsedNodes(), function(d) {
            return d.id;
        });


    node.transition()
        .duration(TRANSITION_DURATION)
        .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .style("opacity", OPACITY.NODE_DEFAULT)
        .select("rect")
        .style("fill", function(d) {
            d.color = colorScale(d.type.replace(/ .*/, ""));
            return d.color;
        })
        .style("stroke", function(d) {
            return d3.rgb(colorScale(d.type.replace(/ .*/, ""))).darker(0.1);
        })
        .style("stroke-WIDTH", "1px")
        .attr("height", function(d) {
            return d.height;
        })
        .attr("width", biHiSankey.nodeWidth());


    node.exit()
        .transition()
        .duration(TRANSITION_DURATION)
        .attr("transform", function(d) {
            var collapsedAncestor, endX, endY;
            collapsedAncestor = d.ancestors.filter(function(a) {
                return a.state === "collapsed";
            })[0];
            endX = collapsedAncestor ? collapsedAncestor.x : d.x;
            endY = collapsedAncestor ? collapsedAncestor.y : d.y;
            return "translate(" + endX + "," + endY + ")";
        })
        .remove();


    nodeEnter = node.enter().append("g").attr("class", "node");

    nodeEnter
        .attr("transform", function(d) {
            var startX = d._parent ? d._parent.x : d.x,
                startY = d._parent ? d._parent.y : d.y;
            return "translate(" + startX + "," + startY + ")";
        })
        .style("opacity", 1e-6)
        .transition()
        .duration(TRANSITION_DURATION)
        .style("opacity", OPACITY.NODE_DEFAULT)
        .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

    nodeEnter.append("text");
    nodeEnter.append("rect")
        .style("fill", function(d) {
            d.color = colorScale(d.type.replace(/ .*/, ""));
            return d.color;
        })
        .style("stroke", function(d) {
            return d3.rgb(colorScale(d.type.replace(/ .*/, ""))).darker(0.1);
        })
        .style("stroke-WIDTH", "1px")
        .attr("height", function(d) {
            return d.height;
        })
        .attr("width", biHiSankey.nodeWidth());

    node.on("mouseenter", function(g) {
        if (!isTransitioning) {
            restoreLinksAndNodes();
            highlightConnected(g);
            fadeUnconnected(g);

            d3.select(this).select("rect")
                .style("fill", function(d) {
                    d.color = d.netFlow > 0 ? INFLOW_COLOR : OUTFLOW_COLOR;
                    return d.color;
                })
                .style("stroke", function(d) {
                    return d3.rgb(d.color).darker(0.1);
                })
                .style("fill-opacity", OPACITY.LINK_DEFAULT);

            tooltip
                .style("left", g.x + MARGIN.LEFT + "px")
                .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
                .transition()
                .duration(TRANSITION_DURATION)
                .style("opacity", 1).select(".value")
                .text(function() {
                    var name = g.name;
                    var percentage = '';
                    if ( g._parent ) {
                      percentage = g.value / g._parent.value;
                      percentage = " (" + ( 100 * percentage ).toFixed( 1 ) + "%)"
                    }
                    var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
                    return name + percentage + additionalInstructions;
                });
        }
    });

    node.on("mouseleave", function() {
        if (!isTransitioning) {
            hideTooltip();
            restoreLinksAndNodes();
        }
    });

    node.filter(function(d) {
            return d.children.length;
        })
        .on("dblclick", showHideChildren);

    // allow nodes to be dragged to new positions
    node.call(d3.behavior.drag()
        .origin(function(d) {
            return d;
        })
        .on("dragstart", function() {
            // Prevent event propagating, otherwise zoom gets triggered
            d3.event.sourceEvent.stopPropagation();
            d3.event.sourceEvent.preventDefault();
            this.parentNode.appendChild(this);
        })
        .on("drag", dragmove));

    // add in the text for the nodes
    node.filter(function(d) {
            return d.value !== 0;
        })
        .select("text")
        .attr("x", -6)
        .attr("y", function(d) {
            return d.height / 2;
        })
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .attr("transform", null)
        .text(function(d) {
            return d.name;
        })
        .filter(function(d) {
            return d.x < WIDTH / 2;
        })
        .attr("x", 6 + biHiSankey.nodeWidth())
        .attr("text-anchor", "start");


    collapser = svg.select("#collapsers").selectAll(".collapser")
        .data(biHiSankey.expandedNodes(), function(d) {
            return d.id;
        });


    collapserEnter = collapser.enter().append("g").attr("class", "collapser");

    collapserEnter.append("circle")
        .attr("r", COLLAPSER.RADIUS)
        .style("fill", function(d) {
            d.color = colorScale(d.type.replace(/ .*/, ""));
            return d.color;
        });

    collapserEnter
        .style("opacity", OPACITY.NODE_DEFAULT)
        .attr("transform", function(d) {
            return "translate(" + (d.x + d.width / 2) + "," + (d.y + COLLAPSER.RADIUS) + ")";
        });

    collapserEnter.on("dblclick", showHideChildren);

    collapser.select("circle")
        .attr("r", COLLAPSER.RADIUS);

    collapser.transition()
        .delay(TRANSITION_DURATION)
        .duration(TRANSITION_DURATION)
        .attr("transform", function(d, i) {
            return "translate(" +
                (COLLAPSER.RADIUS + i * 2 * (COLLAPSER.RADIUS + COLLAPSER.SPACING)) +
                "," +
                (-COLLAPSER.RADIUS - OUTER_MARGIN) +
                ")";
        });

    collapser.on("mouseenter", function(g) {
        if (!isTransitioning) {
            showTooltip().select(".value")
                .text(function() {
                    return g.name + "\n(Double click to collapse)";
                });

            var highlightColor = highlightColorScale(g.type.replace(/ .*/, ""));

            d3.select(this)
                .style("opacity", OPACITY.NODE_HIGHLIGHT)
                .select("circle")
                .style("fill", highlightColor);

            node.filter(function(d) {
                    return d.ancestors.indexOf(g) >= 0;
                }).style("opacity", OPACITY.NODE_HIGHLIGHT)
                .select("rect")
                .style("fill", highlightColor);
        }
    });

    collapser.on("mouseleave", function(g) {
        if (!isTransitioning) {
            hideTooltip();
            d3.select(this)
                .style("opacity", OPACITY.NODE_DEFAULT)
                .select("circle")
                .style("fill", function(d) {
                    return d.color;
                });

            node.filter(function(d) {
                    return d.ancestors.indexOf(g) >= 0;
                }).style("opacity", OPACITY.NODE_DEFAULT)
                .select("rect")
                .style("fill", function(d) {
                    return d.color;
                });
        }
    });

    collapser.exit().remove();

}

// Cache the XHR loads for offline use
var CACHE = {};
var cachedLoad = function(path, callback) {
    if (CACHE[path]) {
        callback(JSON.parse(CACHE[path]));
    } else {
        d3.json(path, function(data) {
            CACHE[path] = JSON.stringify(data);
            callback(data);
        });
    }
};

var loadData = function(path, filter, topten) {
    cachedLoad(path, function(data) {
        // Transform data into format expected by plugin
        var nodes = data.nodes;
        var links = data.links;
        nodes.forEach(function(node, index) {
            node.id = index;
            node.type = '' + node.group;
            node.parent = '' + node.group;
            if ( node.name ) { node.name = node.name.toUpperCase(); }
        });

        if ( topten ) {
          // Tally up how much of each node we have
          var counts = {};
          links.forEach(function(link) {
            var source = nodes[link.source];
            var target = nodes[link.target];
            [source, target].forEach( function ( node ) {
              // Keep track of how many nodes with the same
              // name are in each column
              if ( !counts[ node.type ] ) { counts[ node.type ] = {}; }
              if ( counts[ node.type ][ node.name ] ) {
                counts[ node.type ][ node.name ]++;
              } else {
                counts[ node.type ][ node.name ] = 1;
              }
            });
          });

          Object.keys(counts).forEach( function( type ) {
            // Convert to array so we can sort
            var array = [];
            Object.keys( counts[ type ] ).forEach( function( o ) {
              var entry = {
                name: o,
                count: counts[ type ][ o ]
              };
              array.push( entry );
            } );

            // Sort
            counts[ type ] = array.sort( function ( a, b ) { return b.count - a.count; } );

            // Now map to list of top ten
            var limit = 10;
            counts[ type ] = counts[ type ].slice(0, 10).map( function ( a ) { return a.name; } );

            // If we have more than 10 add an Other node
            if ( counts[ type ].length >= limit ) {
              var otherNode = {
                type: type,
                id: type + '_other',
                parent: type,
                name: 'Other'
              };

              nodes.unshift( otherNode );

              // Update parent nodes for this other node
              nodes.forEach( function ( node ) {
                if ( node.type !== type ||
                     ( '' + node.id ).slice( -6 ) === '_other' ) {
                  return;
                }
                if ( counts[ type ].indexOf( node.name ) === -1 ) {
                  node.parent = type + '_other';
                }
              } );
            }
          } );
        }

        if (filter !== undefined) {
            // Filter our nodes based on the field name. Need to keep track
            // of which nodes we removed so that we can any links referencing them
            var groupToFilter = "GOAL"; // Only filter out Topic nodes to maintain hierarchy
            var indicesToRemove = [];
            var filteredNodes = [];
            nodes.forEach(function(node) {
                if (node.name === filter || node.group !== groupToFilter) {
                    filteredNodes.push(node);
                } else {
                    indicesToRemove.push(node.id);
                }
            });
            nodes = filteredNodes;
        }

        // Generate parent nodes based on types in data
        var parents = [];
        var addedParents = [];
        nodes.forEach(function(node) {
            if ( node.parent.slice( -6 ) === '_other' ) {
              return;
            }
            if (addedParents.indexOf(node.parent) === -1) {
                var parent = {
                    type: node.type,
                    id: node.type,
                    parent: null,
                    name: node.type
                };
                parents.push(parent);
                addedParents.push(node.parent);
            }
        });
        nodes = parents.concat(nodes);


        // Remove any links referenced during filtering
        if (filter !== undefined) {
            links = links.filter(function(link) {
                // If both the link's source and target is not present in
                // list, then keep this link
                return (
                    indicesToRemove.indexOf(link.source) === -1 &&
                    indicesToRemove.indexOf(link.target) === -1
                );
            });
        }

        // Override link value so all lines are equal width
        links.forEach(function(link) {
            link.value = 1;
        });
        biHiSankey
            .nodes(nodes)
            .links(links)
            .initializeNodes(function(node) {
                node.state = node.parent ? "contained" : "collapsed";
                // Uncomment to start expanded
                //node.state = node.parent ? "collapsed" : "expanded";
            })
            .layout(LAYOUT_INTERATIONS);

        // Arrange children in columns
        var columns = {};
        var columnSpacing = WIDTH / (parents.length - 1) - NODE_WIDTH;
        biHiSankey.nodes().forEach(function(node) {
            if (node.parent) {
                // Arrange child nodes at same location as parent
                node.x = node.parent.x;

                // Offset the position of the 'other' node so we don't interfere with top ten
                if ( ( '' + node.id ).slice( -6 ) === '_other' ) {
                  node.x += 0.5 * columnSpacing;
                }
                if (!columns[node.x]) {
                    columns[node.x] = 0;
                }
                node.y = columns[node.x];

                // Space nodes next to each other in each column
                columns[node.x] += node.heightAllowance;
            } else {
                node.x = columnSpacing * parents.indexOf(node);
                node.y = 100;
            }
        });
        biHiSankey.relayout();

        disableUserInterractions(2 * TRANSITION_DURATION);

        update();
    });
};

// Load data when item is selected in dropdown
$('.dropdown-item').click(function() {
    var source = this.dataset.source;
    var filter = this.dataset.filter;
    var topten = this.dataset.topten;
    if (source) {
        loadData(source, filter, topten);
    }
});


// Load first source and preload others
var dataSources = [];
$('.dropdown-item').each(function() {
    var source = this.dataset.source;
    if (dataSources.indexOf(source) === -1) {
        dataSources.push(source);
        if (dataSources.length === 1) {
            loadData(source);
        } else {
            cachedLoad(source, function() {
                console.log("Preloaded", source);
            });
        }
    }
});
