document.addEventListener('DOMContentLoaded', () => {
    const titleList = document.getElementById('title-list');
    const sortButton = document.getElementById('sort-button');
    const sliderInput = document.getElementById('sliderInput');
    const sliderValue = document.getElementById('sliderValue');
    const sliderSpan = document.getElementById('slider-span');
    const sliderContainer = document.getElementById('slider-container');
    let sortByCitations = true; // Default sorting by citations

    const graphContainer = d3.select('#graph-container');
    const width = graphContainer.node().clientWidth;
    const height = graphContainer.node().clientHeight;
    let svg = graphContainer.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .call(d3.zoom().on("zoom", function (event) {
            svg.attr("transform", event.transform);
        }))
        .append("g");

    document.getElementById('button-container').addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON' && event.target.className === 'paper-button') {
            try {
                const jsonData = JSON.parse(event.target.dataset.json);
                displayPaperTitles(jsonData.nodes, sortByCitations);
                updateGraph(jsonData);
                updateSlider(jsonData);
                sliderContainer.style.display = 'flex'; // Show the slider container
            } catch (error) {
                alert('Error displaying paper titles or updating graph.');
            }
        }
    });

    sortButton.addEventListener('click', () => {
        sortByCitations = !sortByCitations; // Toggle sorting criteria
        sortButton.textContent = sortByCitations ? 'Sort by Date' : 'Sort by Citations';
        const event = new CustomEvent('sortPapers', { detail: { sortByCitations } });
        document.dispatchEvent(event);
    });

    document.addEventListener('sortPapers', (event) => {
        const jsonData = JSON.parse(document.querySelector('.paper-button').dataset.json);
        displayPaperTitles(jsonData.nodes, event.detail.sortByCitations);
    });

    function displayPaperTitles(nodes, sortByCitations = true) {
        if (sortByCitations) {
            nodes.sort((a, b) => b.citationCount - a.citationCount);
        } else {
            nodes.sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate));
        }

        titleList.innerHTML = ''; // Clear previous list
        nodes.forEach(node => {
            const paperItem = document.createElement('div');
            paperItem.classList.add('paper-item');

            const titleLink = document.createElement('a');
            titleLink.href = node.url;
            titleLink.target = '_blank';
            titleLink.textContent = node.title;
            titleLink.classList.add('paper-title');

            const detailsDiv = document.createElement('div');
            detailsDiv.classList.add('paper-details');
            detailsDiv.textContent = `${node.publicationDate} - ${node.citationCount} citations`;

            paperItem.appendChild(titleLink);
            paperItem.appendChild(detailsDiv);

            titleList.appendChild(paperItem);
        });
    }

    function updateGraph(data) {
        svg.selectAll('*').remove(); // Clear previous graph

        // Sort nodes by citation count and take the top 20
        const topNodes = data.nodes
            .sort((a, b) => b.citationCount - a.citationCount)
            .slice(0, 20);

        // Filter links to include only those that connect top 20 nodes
        const topNodeIds = new Set(topNodes.map(node => node.paperId));
        const topLinks = data.links.filter(link => topNodeIds.has(link.source) && topNodeIds.has(link.target));

        const citationScale = d3.scaleSqrt()
            .domain([0, d3.max(topNodes, d => d.citationCount)])
            .range([10, 30]); // Adjusted range for node sizes

        const colorScale = d3.scaleSequential(d3.interpolateCool)
            .domain([0, d3.max(topNodes, d => d.citationCount)]); // Adjust color scale domain

        const simulation = d3.forceSimulation(topNodes)
            .force('link', d3.forceLink(topLinks).id(d => d.paperId).distance(200)) // Increased distance for links
            .force('charge', d3.forceManyBody().strength(-500)) // Increased repulsion for nodes
            .force('center', d3.forceCenter(width / 2, height / 2));

        const link = svg.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(topLinks)
            .enter().append('line')
            .attr('stroke-width', 1) // Reduced stroke width for links
            .attr('stroke', '#999');

        const node = svg.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(topNodes)
            .enter().append('circle')
            .attr('r', d => citationScale(d.citationCount))
            .attr('fill', d => colorScale(d.citationCount))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended))
            .on('mouseover', handleMouseOver)
            .on('mouseout', handleMouseOut);

        const label = svg.append('g')
            .selectAll('text')
            .data(topNodes)
            .enter().append('text')
            .attr('dy', '.35em') // Center vertically on the node
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('pointer-events', 'none')
            .style('text-shadow', `
                -2px -2px 4px rgba(0, 0, 0, 0.8),
                 2px -2px 4px rgba(0, 0, 0, 0.8),
                -2px  2px 4px rgba(0, 0, 0, 0.8),
                 2px  2px 4px rgba(0, 0, 0, 0.8)`)
            .text(d => `[${new Date(d.publicationDate).getFullYear()}] ${d.title.split(' ')[0]}`); // Display date and first word

        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            label
                .attr('x', d => d.x)
                .attr('y', d => d.y); // Center text on the node
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        function handleMouseOver(event, d) {
            d3.select(this).append('title').text(d.title); // Show full title on hover
        }

        function handleMouseOut(event, d) {
            d3.select(this).select('title').remove(); // Remove title on mouse out
        }
    }

    function updateSlider(data) {
        const citations = data.nodes.map(node => node.citationCount);
        const minCitations = Math.min(...citations);
        const maxCitations = Math.max(...citations);

        sliderInput.min = minCitations;
        sliderInput.max = maxCitations;

        const initialValue = Math.round(maxCitations * 0.75);
        sliderInput.value = initialValue;
        sliderValue.textContent = initialValue;

        sliderInput.addEventListener('input', () => {
            sliderValue.textContent = sliderInput.value;
            updateSliderSpanPosition(sliderInput.value, minCitations, maxCitations);
        });

        updateSliderSpanPosition(initialValue, minCitations, maxCitations);
    }

    function updateSliderSpanPosition(value, min, max) {
        const percentage = (value - min) / (max - min) * 100;
        sliderSpan.style.left = `calc(${percentage}%)`;
    }
});
