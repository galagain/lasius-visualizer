document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const titleList = document.getElementById("title-list");
  const sortButton = document.getElementById("sort-button");
  const sliderInput = document.getElementById("sliderInput");
  const sliderValue = document.getElementById("sliderValue");
  const sliderSpan = document.getElementById("slider-span");
  const sliderContainer = document.getElementById("slider-container");
  const queriesContainer = document.getElementById("queries-container");
  const papersCount = document.getElementById("papers-count");
  const paperDetailsContainer = document.getElementById(
    "paper-details-container"
  ); // The container for paper details
  const paperDetails = document.getElementById("paper-details"); // The content area within the container

  // State Variables
  let sortByCitations = true; // Default sorting by citations
  let citationValues = []; // To store unique citation counts
  let clickedNode = null; // To store the clicked node
  let activeQueries = new Set(); // To store active queries

  const graphContainer = d3.select("#graph-container");
  const width = graphContainer.node().clientWidth;
  const height = graphContainer.node().clientHeight;
  let svg = graphContainer
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .append("g");

  const zoom = d3
    .zoom()
    .scaleExtent([0.5, 10])
    .on("zoom", (event) => {
      svg.attr("transform", event.transform);
    });

  graphContainer.call(zoom);

  // Prevent slider interactions from triggering zoom
  sliderContainer.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });

  sliderContainer.addEventListener("mouseup", (event) => {
    event.stopPropagation();
  });

  document
    .getElementById("button-container")
    .addEventListener("click", (event) => {
      if (
        event.target.tagName === "BUTTON" &&
        event.target.className === "paper-button"
      ) {
        try {
          const jsonData = JSON.parse(event.target.dataset.json);
          const paperIds = new Set(Object.values(jsonData.queries).flat());
          const papers = jsonData.papers.filter((paper) =>
            paperIds.has(paper.paperId)
          );
          displayPaperTitles(papers, sortByCitations);
          citationValues = getUniqueCitationValues(papers);
          updateSlider(citationValues);
          sliderContainer.style.display = "flex";

          document
            .querySelectorAll(".paper-button")
            .forEach((button) => button.classList.remove("active"));
          event.target.classList.add("active");

          const initialCitationValue =
            citationValues[Math.floor(citationValues.length * 0.75)];
          document.dispatchEvent(
            new CustomEvent("updateGraph", {
              detail: { jsonData, minCitations: initialCitationValue, papers },
            })
          );

          // Display queries as buttons
          displayQueries(jsonData.queries);
          // Set active queries
          activeQueries = new Set(Object.keys(jsonData.queries));
        } catch (error) {
          alert("Error displaying paper titles or updating graph.");
        }
      }
    });

  sortButton.addEventListener("click", () => {
    sortByCitations = !sortByCitations; // Toggle sorting criteria
    sortButton.textContent = sortByCitations
      ? "Sort by Date"
      : "Sort by Citations";
    const event = new CustomEvent("sortPapers", {
      detail: { sortByCitations },
    });
    document.dispatchEvent(event);
  });

  document.addEventListener("sortPapers", (event) => {
    const jsonData = JSON.parse(
      document.querySelector(".paper-button.active").dataset.json
    );
    const paperIds = new Set(Object.values(jsonData.queries).flat());
    const papers = jsonData.papers.filter((paper) =>
      paperIds.has(paper.paperId)
    );
    displayPaperTitles(papers, event.detail.sortByCitations);
  });

  sliderInput.addEventListener("input", () => {
    const index = parseInt(sliderInput.value);
    const citationValue = citationValues[index];
    sliderValue.textContent = citationValue;
    const jsonData = JSON.parse(
      document.querySelector(".paper-button.active").dataset.json
    );
    const activePaperIds = getActivePaperIds(jsonData); // Use active queries to get papers
    const papers = jsonData.papers.filter((paper) =>
      activePaperIds.has(paper.paperId)
    );
    document.dispatchEvent(
      new CustomEvent("updateGraph", {
        detail: { jsonData, minCitations: citationValue, papers },
      })
    );
    updateSliderSpanPosition(index, 0, citationValues.length - 1);
  });

  document.addEventListener("updateGraph", (event) => {
    const jsonData = event.detail.jsonData;
    updateGraph(jsonData, event.detail.minCitations, event.detail.papers);
  });

  function displayQueries(queries) {
    queriesContainer.innerHTML = ""; // Clear previous queries

    Object.keys(queries).forEach((query) => {
      const queryButton = document.createElement("button");
      queryButton.classList.add("query-button");
      queryButton.textContent = query;
      queryButton.addEventListener("click", () => {
        toggleQuery(query);
      });
      queriesContainer.appendChild(queryButton);
      activeQueries.add(query); // Add query to activeQueries by default
    });

    // Initialize query button styles
    updateQueryButtonStyles();
  }

  function toggleQuery(query) {
    if (activeQueries.has(query)) {
      if (activeQueries.size > 1) {
        activeQueries.delete(query);
      }
    } else {
      activeQueries.add(query);
    }
    updateQueryButtonStyles();
    updateDisplayedPapers();
  }

  function updateQueryButtonStyles() {
    queriesContainer.querySelectorAll(".query-button").forEach((button) => {
      if (activeQueries.has(button.textContent)) {
        button.classList.remove("inactive");
      } else {
        button.classList.add("inactive");
      }
    });
  }

  function updateDisplayedPapers() {
    const jsonData = JSON.parse(
      document.querySelector(".paper-button.active").dataset.json
    );
    const activePaperIds = getActivePaperIds(jsonData);
    const papers = jsonData.papers.filter((paper) =>
      activePaperIds.has(paper.paperId)
    );

    displayPaperTitles(papers, sortByCitations);
    citationValues = getUniqueCitationValues(papers);
    updateSlider(citationValues);

    const initialCitationValue =
      citationValues[Math.floor(citationValues.length * 0.75)];
    document.dispatchEvent(
      new CustomEvent("updateGraph", {
        detail: { jsonData, minCitations: initialCitationValue, papers },
      })
    );
  }

  function displayPaperTitles(papers, sortByCitations = true) {
    if (sortByCitations) {
      papers.sort((a, b) => b.citationCount - a.citationCount);
    } else {
      papers.sort(
        (a, b) => new Date(b.publicationDate) - new Date(a.publicationDate)
      );
    }

    titleList.innerHTML = ""; // Clear previous list
    papers.forEach((paper) => {
      const paperItem = document.createElement("div");
      paperItem.classList.add("paper-item");

      const titleLink = document.createElement("a");
      titleLink.href = paper.url;
      titleLink.target = "_blank";
      titleLink.textContent = paper.title;
      titleLink.classList.add("paper-title");

      const detailsDiv = document.createElement("div");
      detailsDiv.classList.add("paper-details");
      detailsDiv.textContent = `${paper.publicationDate} - ${paper.citationCount} citations`;

      paperItem.appendChild(titleLink);
      paperItem.appendChild(detailsDiv);

      titleList.appendChild(paperItem);
    });

    // Update the papers count
    papersCount.textContent = papers.length;
  }

  function getUniqueCitationValues(papers) {
    const citationCounts = papers.map((paper) => paper.citationCount);
    return [...new Set(citationCounts)].sort((a, b) => a - b);
  }

  // Declare simulation at the top level to be accessible in handleNodeClick
  let simulation;

  function updateGraph(data, minCitations, papers) {
    svg.selectAll("*").remove();

    const filteredPapers = papers.filter(
      (paper) => paper.citationCount >= minCitations
    );
    const filteredPaperIds = new Set(
      filteredPapers.map((paper) => paper.paperId)
    );
    const filteredLinks = data.links.filter(
      (link) =>
        filteredPaperIds.has(link.source) && filteredPaperIds.has(link.target)
    );

    const citationScale = d3
      .scaleSqrt()
      .domain([0, d3.max(filteredPapers, (d) => d.citationCount)])
      .range([10, 30]);

    const colorScale = d3
      .scaleSequential(d3.interpolateCool)
      .domain([0, d3.max(filteredPapers, (d) => d.citationCount)]);

    // Initialize simulation within the updateGraph function
    simulation = d3
      .forceSimulation(filteredPapers)
      .force(
        "link",
        d3
          .forceLink(filteredLinks)
          .id((d) => d.paperId)
          .distance(200)
      )
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(filteredLinks)
      .enter()
      .append("line")
      .attr("stroke-width", 1)
      .attr("stroke", "#999");

    const node = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(filteredPapers)
      .enter()
      .append("circle")
      .attr("r", (d) => citationScale(d.citationCount))
      .attr("fill", (d) => colorScale(d.citationCount))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("click", function (event, d) {
        handleNodeClick(d3.select(this), d); // Pass node data
      });

    const text = svg
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(filteredPapers)
      .enter()
      .append("text")
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("pointer-events", "none")
      .style("font-size", "0.7rem")
      .style("text-shadow", "0 0 1rem rgba(0, 0, 0, 1)") // Add text shadow
      .text((d) => {
        const firstAuthorId = d.authorIds[0];
        const firstAuthor = data.authors[firstAuthorId];
        const year = new Date(d.publicationDate).getFullYear();
        return `${firstAuthor.split(" ").pop()} ${year}`;
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

      text.attr("x", (d) => d.x).attr("y", (d) => d.y);
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

  function handleNodeClick(selectedNode, nodeData) {
    if (clickedNode && clickedNode.node() === selectedNode.node()) {
      // If the same node is clicked again, reset all nodes, links, and texts
      svg.selectAll("circle").style("opacity", 1);
      svg.selectAll("line").style("opacity", 1);
      svg.selectAll("text").style("opacity", 1);
      clickedNode = null;
      paperDetails.textContent =
        "Cliquez sur un papier pour afficher son nom ici."; // Reset the text
      paperDetailsContainer.classList.remove("visible"); // Hide the container
    } else {
      // If a different node is clicked, set all nodes, links, and texts to less visible except the clicked one
      const relatedLinks = svg
        .selectAll("line")
        .filter(
          (link) =>
            link.source === selectedNode.datum() ||
            link.target === selectedNode.datum()
        );

      const relatedNodes = new Set();
      relatedLinks.each(function (link) {
        relatedNodes.add(link.source);
        relatedNodes.add(link.target);
      });

      svg.selectAll("circle").style("opacity", 0.1);
      svg.selectAll("line").style("opacity", 0.1);
      svg.selectAll("text").style("opacity", 0);

      relatedNodes.forEach((node) => {
        svg
          .selectAll("circle")
          .filter((d) => d === node)
          .style("opacity", 1);
        svg
          .selectAll("text")
          .filter((d) => d === node)
          .style("opacity", 1);
      });

      selectedNode.style("opacity", 1);
      relatedLinks.style("opacity", 1);
      clickedNode = selectedNode;

      // Restart the simulation for better layout
      simulation.alpha(1).restart();

      // Update paper details with the title of the clicked node
      paperDetails.textContent = `Titre: ${nodeData.title}`; // Ensure nodeData has a title property
      paperDetailsContainer.classList.add("visible"); // Show the container
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
    const percentage = ((index - minIndex) / (maxIndex - minIndex)) * 100;
    sliderSpan.style.left = `calc(${percentage}%)`;
  }

  function getActivePaperIds(jsonData) {
    // Collect all paper IDs from active queries
    const activePaperIds = new Set();
    activeQueries.forEach((query) => {
      const paperIds = jsonData.queries[query];
      if (paperIds) {
        paperIds.forEach((id) => activePaperIds.add(id));
      }
    });
    return activePaperIds;
  }
});
