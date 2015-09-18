$(function () {
    (function (H) {
        var Chart = H.Chart,
            each = H.each,
            SVGRenderer = H.SVGRenderer,
            wrap = H.wrap;
        
        // These ones are translated to attributes rather than styles
        SVGRenderer.prototype.inlineToAttributes = [
            'fill',
            'stroke',
            'strokeLinecap',
            'strokeLinejoin',
            'strokeWidth',
            'x',
            'y'
        ];
        SVGRenderer.prototype.unstyledElements = [
            'clipPath',
            'defs',
            'desc'
        ];
            

        /**
         * Analyze inherited styles from stylesheets and add them inline
         *
         * @todo: What are the border styles for text about? In general, text has a lot of properties.
         * @todo: Make it work with IE9 and IE10.
         */
        Chart.prototype.inlineStyles = function () {
            var inlineToAttributes = this.renderer.inlineToAttributes,
                unstyledElements = this.renderer.unstyledElements,
                defaultStyles = {},
                dummySVG;
            console.time('inlineStyles')
            /**
             * Make hyphenated property names out of camelCase
             */
            function hyphenate(prop) {
                return prop.replace(
                    /([A-Z])/g, 
                    function (a, b) { 
                        return '-' + b.toLowerCase();
                    }
                );
            }

            /**
             * Call this on all elements and recurse to children
             */
            function recurse(node) {
                var prop,
                    styles,
                    parentStyles,
                    cssText = '',
                    dummy,
                    styleAttr;
                
                if (node.nodeType === 1 && unstyledElements.indexOf(node.nodeName) === -1) {
                    styles = window.getComputedStyle(node, null);
                    parentStyles = window.getComputedStyle(node.parentNode, null);

                    // Get default styles from the browser so that we don't have to add these
                    if (!defaultStyles[node.nodeName]) {
                        if (!dummySVG) {
                            dummySVG = document.createElementNS(Highcharts.SVG_NS, 'svg');
                            dummySVG.setAttribute('version', '1.1');
                            document.body.appendChild(dummySVG);
                        }
                        dummy = document.createElementNS(node.namespaceURI, node.nodeName);
                        dummySVG.appendChild(dummy);
                        defaultStyles[node.nodeName] = Highcharts.merge(window.getComputedStyle(dummy, null)); // Copy, so we can remove the node
                        dummySVG.removeChild(dummy);
                    }

                    // Loop over all the computed styles and check whether they are in the 
                    // white list for styles or atttributes.
                    for (prop in styles) {
                        if (prop !== 'cssText') {
                            
                             // If parent node has the same style, it gets inherited, no need to inline it
                            if (parentStyles[prop] !== styles[prop] && defaultStyles[node.nodeName][prop] !== styles[prop]) {

                                // Attributes
                                if (inlineToAttributes.indexOf(prop) !== -1) {
                                    node.setAttribute(hyphenate(prop), styles[prop]);

                                // Styles
                                } else /*if (exportWhitelist[prop] === 2)*/ {
                                    cssText += hyphenate(prop) + ':' + styles[prop] + ';';
                                }
                            }
                        }
                    }

                    // Apply styles
                    if (cssText) {
                        styleAttr = node.getAttribute('style');
                        node.setAttribute('style', (styleAttr ? styleAttr + ';' : '') + cssText);
                    }

                    // Recurse
                    each(node.children || node.childNodes, recurse);
                }
            }

            /**
             * Remove the dummy objects used to get defaults
             */
            function tearDown() {
                dummySVG.parentNode.removeChild(dummySVG);
            }

            recurse(this.container.querySelector('svg'));
            tearDown();

            console.timeEnd('inlineStyles');

            console.log('SVG length (characters)', this.container.innerHTML.length)

        };

        // Override the method used from export
        wrap(Chart.prototype, 'getChartHTML', function (proceed) {
            this.inlineStyles();
            return proceed.call(this); 
        });

    }(Highcharts));


    $('#container').highcharts({
        
        chart: {
            type: 'column'
        },

        title: {
            text: 'POC: Exporting CSS-based Highcharts'
        },

        xAxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        },
        
        plotOptions: {
            series: {
                stacking: 'normal'
            }
        },
        
        legend: {
            align: 'right',
            verticalAlign: 'middle',
            layout: 'vertical'
        },

        series: [{
            data: [1, 2, 3]
            
        }, {
            data: [1, 2, 3]
            
        }, {
            data: [1, 2, 3]
            
        }]

    });

    $('#pre').html((function () {
        var indent = '';
        return $('#container').highcharts().getSVG()
            .replace(/(<\/?|\/?>)/g, function (a) {
                var ret;
                if (a === '<') {
                    ret = '\n' + indent + '&lt;';
                    indent += '   ';
                } else if (a === '>') {
                    ret = '&gt;';
                } else if (a === '</') {
                    indent = indent.substr(3);
                    ret = '\n' + indent + '&lt;/';
                } else if (a === '/>') {
                    indent = indent.substr(3);
                    ret = '/&lt;';
                }
                return ret;
            });
    }()));

});