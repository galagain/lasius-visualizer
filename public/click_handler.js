document.addEventListener('DOMContentLoaded', () => {
    const titleList = document.getElementById('title-list');
    const sortButton = document.getElementById('sort-button');
    const sliderInput = document.getElementById('sliderInput');
    const sliderValue = document.getElementById('sliderValue');
    const sliderSpan = document.getElementById('slider-span');
    const sliderContainer = document.getElementById('slider-container');
    const paperDetailsContainer = document.getElementById('paper-details-container');
    const paperDetails = document.getElementById('paper-details');
    let sortByCitations = true; // Default sorting by citations
    let citationValues = []; // To store unique citation counts

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
                citationValues = getUniqueCitationValues(jsonData.nodes);
                updateSlider(citationValues);
                updateGraph(jsonData, citationValues[Math.floor(citationValues.length * 0.75)]);
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

    sliderInput.addEventListener('input', () => {
        const index = parseInt(sliderInput.value);
        const citationValue = citationValues[index];
        sliderValue.textContent = citationValue;
        const event = new CustomEvent('updateGraph', { detail: { minCitations: citationValue } });
        document.dispatchEvent(event);
        updateSliderSpanPosition(index, 0, citationValues.length - 1);
    });

    document.addEventListener('updateGraph', (event) => {
        const jsonData = JSON.parse(document.querySelector('.paper-button').dataset.json);
        updateGraph(jsonData, event.detail.minCitations);
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

    function getUniqueCitationValues(nodes) {
        const citationCounts = nodes.map(node => node.citationCount);
        return [...new Set(citationCounts)].sort((a, b) => a - b);
    }

    function updateGraph(data, minCitations) {
        svg.selectAll('*').remove(); // Clear previous graph

        // Filter nodes based on minCitations
        const filteredNodes = data.nodes.filter(node => node.citationCount >= minCitations);

        // Filter links to include only those that connect filtered nodes
        const filteredNodeIds = new Set(filteredNodes.map(node => node.paperId));
        const filteredLinks = data.links.filter(link => filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target));

        const citationScale = d3.scaleSqrt()
            .domain([0, d3.max(filteredNodes, d => d.citationCount)])
            .range([10, 30]); // Adjusted range for node sizes

        const colorScale = d3.scaleSequential(d3.interpolateCool)
            .domain([0, d3.max(filteredNodes, d => d.citationCount)]); // Adjust color scale domain

        const simulation = d3.forceSimulation(filteredNodes)
            .force('link', d3.forceLink(filteredLinks).id(d => d.paperId).distance(200)) // Increased distance for links
            .force('charge', d3.forceManyBody().strength(-500)) // Increased repulsion for nodes
            .force('center', d3.forceCenter(width / 2, height / 2));

        const link = svg.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(filteredLinks)
            .enter().append('line')
            .attr('stroke-width', 1) // Reduced stroke width for links
            .attr('stroke', '#999');

        const node = svg.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(filteredNodes)
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
            .on('mouseout', handleMouseOut)
            .on('click', handleClick); // Add click event to nodes

        const label = svg.append('g')
            .selectAll('text')
            .data(filteredNodes)
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
            .text(d => {
                if (d.publicationDate) {
                    const year = new Date(d.publicationDate).getFullYear();
                    return `[${year}] ${d.title.split(' ')[0]}`;
                } else {
                    return `${d.title.split(' ')[0]}`;
                }
            }); // Display date and first word if date is not null

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

        function handleClick(event, d) {
            displayPaperDetails(d); // Display paper details on click
            highlightLinks(d); // Highlight links connected to the clicked node
        }
    }

    function updateSlider(citationValues) {
        sliderInput.min = 0;
        sliderInput.max = citationValues.length - 1;
        sliderInput.step = 1;

        const initialIndex = Math.floor(citationValues.length * 0.75);
        sliderInput.value = initialIndex;
        sliderValue.textContent = citationValues[initialIndex];

        updateSliderSpanPosition(initialIndex, 0, citationValues.length - 1);
    }

    function updateSliderSpanPosition(index, minIndex, maxIndex) {
        const percentage = (index - minIndex) / (maxIndex - minIndex) * 100;
        sliderSpan.style.left = `calc(${percentage}%)`;
    }

    function displayPaperDetails(paper) {
        const authors = paper.authors.map(author => `<li>${author.name}</li>`).join('');
        paperDetails.innerHTML = `
            <h3>${paper.title}</h3>
            <p><strong>Publication Date:</strong> ${paper.publicationDate}</p>
            <p><strong>Citation Count:</strong> ${paper.citationCount}</p>
            <p><strong>Authors:</strong></p>
            <ul>${authors}</ul>
            <p><a href="${paper.url}" target="_blank">Read Paper</a></p>
        `;
        paperDetails.classList.add('visible'); // Show the paper details container
    }

    function highlightLinks(node) {
        const connectedPapers = new Set();
        connectedPapers.add(node.paperId);

        svg.selectAll('line').attr('stroke', link => {
            if (link.source.paperId === node.paperId) {
                connectedPapers.add(link.target.paperId);
                return 'red'; // Outgoing links (citations)
            } else if (link.target.paperId === node.paperId) {
                connectedPapers.add(link.source.paperId);
                return 'green'; // Incoming links (references)
            } else {
                return '#999'; // Default link color
            }
        }).attr('opacity', link =>
            link.source.paperId === node.paperId || link.target.paperId === node.paperId ? 1 : 0.1
        );

        svg.selectAll('circle').attr('opacity', d =>
            connectedPapers.has(d.paperId) ? 1 : 0.1
        );

        svg.selectAll('text').attr('opacity', d =>
            connectedPapers.has(d.paperId) ? 1 : 0.1
        );

        d3.selectAll('.paper-item').style('opacity', function() {
            const paperId = d3.select(this).select('a').attr('href').split('/').pop();
            return connectedPapers.has(paperId) ? 1 : 0.1;
        });
    }
});
