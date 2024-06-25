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
        updateGraph(jsonData);
    });

    function displayPaperTitles(nodes, sortByCitations = true) {
        // Sort nodes by citation count or publication date
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

        const minDate = d3.min(topNodes, d => new Date(d.publicationDate));
        const maxDate = d3.max(topNodes, d => new Date(d.publicationDate));
        const dateScale = d3.scaleTime()
            .domain([minDate, maxDate])
            .range([3, 30]); // Increased range for radii to accentuate size differences

        const colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
            .domain([maxDate, minDate]); // Reverse the domain for better color distinction

        const simulation = d3.forceSimulation(topNodes)
            .force('link', d3.forceLink(topLinks).id(d => d.paperId).distance(200))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2));

        const link = svg.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(topLinks)
            .enter().append('line')
            .attr('stroke-width', 2)
            .attr('stroke', '#999');

        const node = svg.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(topNodes)
            .enter().append('circle')
            .attr('r', d => dateScale(new Date(d.publicationDate)))
            .attr('fill', d => colorScale(new Date(d.publicationDate)))
            .attr('stroke', '#333')
            .attr('stroke-width', 1.5)
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        node.append('title')
            .text(d => d.title);

        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
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
    }

    function updateSlider(data) {
        const citations = data.nodes.map(node => node.citationCount);
        const minCitations = Math.min(...citations);
        const maxCitations = Math.max(...citations);

        // Update slider min and max
        sliderInput.min = minCitations;
        sliderInput.max = maxCitations;

        // Set initial value to 75% of the max citations
        const initialValue = Math.round(maxCitations * 0.75);
        sliderInput.value = initialValue;
        sliderValue.textContent = initialValue;

        // Add event listener to update value display and position on input change
        sliderInput.addEventListener('input', () => {
            sliderValue.textContent = sliderInput.value;
            updateSliderSpanPosition(sliderInput.value, minCitations, maxCitations);
        });

        // Ensure initial position is correct
        updateSliderSpanPosition(initialValue, minCitations, maxCitations);
    }

    function updateSliderSpanPosition(value, min, max) {
        const percentage = (value - min) / (max - min) * 100;
        sliderSpan.style.left = `calc(${percentage}%`; // Adjust position relative to the slider
        sliderSpan.style.transform = 'translateX(-50%)'; // Center the span
    }
});
