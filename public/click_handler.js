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
  const nodeTooltip = document.getElementById("node-tooltip"); // Tooltip element
  const toggleDepthButton = document.getElementById("toggle-depth-button");

  // State Variables
  let sortByCitations = true; // Default sorting by citations
  let citationValues = []; // To store unique citation counts
  let clickedNode = null; // To store the clicked node
  let activeQueries = new Set(); // To store active queries
  let currentTransform = d3.zoomIdentity; // To track current zoom/pan transform
  let currentDepth = 0; // Default mode is 0

  const graphContainer = d3.select("#graph-container");
  const width = graphContainer.node().clientWidth;
  const height = graphContainer.node().getBoundingClientRect().height;

  let svg = graphContainer
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .append("g");

  const zoom = d3
    .zoom()
    .scaleExtent([0.01, 100]) // Allow infinite zoom in and out
    .on("zoom", (event) => {
      currentTransform = event.transform;
      svg.attr("transform", currentTransform);
      if (clickedNode) updateTooltipPosition(clickedNode.datum());
    });

  graphContainer.call(zoom);

  // Prevent slider interactions from triggering zoom
  sliderContainer.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });

  sliderContainer.addEventListener("mouseup", (event) => {
    event.stopPropagation();
  });

  toggleDepthButton.addEventListener("click", () => {
    if (currentDepth === 0) {
      currentDepth = 1;
      toggleDepthButton.textContent = "Switch to Depth 0";
    } else {
      currentDepth = 0;
      toggleDepthButton.textContent = "Switch to Depth 1";
    }
    updateDisplayedPapers();
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
          const queriesSource =
            currentDepth === 0 ? jsonData.queries : jsonData.queries_more;
          const paperIds = new Set(Object.values(queriesSource).flat());
          const papers = removeDuplicatePapers(
            jsonData.papers.filter((paper) => paperIds.has(paper.paperId))
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
          displayQueries(queriesSource);
          // Set active queries
          activeQueries = new Set(Object.keys(queriesSource));
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
    updateDisplayedPapers(); // Re-display papers with the new sorting criteria
  });

  document.addEventListener("sortPapers", (event) => {
    updateDisplayedPapers();
  });

  sliderInput.addEventListener("input", () => {
    const index = parseInt(sliderInput.value);
    const citationValue = citationValues[index];
    sliderValue.textContent = citationValue;
    const jsonData = JSON.parse(
      document.querySelector(".paper-button.active").dataset.json
    );
    const activePaperIds = getActivePaperIds(jsonData); // Use active queries to get papers
    const papers = removeDuplicatePapers(
      jsonData.papers.filter((paper) => activePaperIds.has(paper.paperId))
    );

    document.dispatchEvent(
      new CustomEvent("updateGraph", {
        detail: { jsonData, minCitations: citationValue, papers },
      })
    );
    updateSliderSpanPosition(index, 0, citationValues.length - 1);
  });

  function resetPaperListClasses() {
    const minCitations = parseInt(sliderValue.textContent);
    document.querySelectorAll(".paper-item").forEach((item) => {
      item.classList.remove("selected", "inactive");
      const citationCount = parseInt(item.dataset.citationCount);

      if (citationCount < minCitations) {
        item.classList.add("inactive");
      }
    });
  }

  document.addEventListener("updateGraph", (event) => {
    const jsonData = event.detail.jsonData;
    updateGraph(jsonData, event.detail.minCitations, event.detail.papers);

    // Hide the tooltip when the graph updates
    nodeTooltip.style.display = "none";
    nodeTooltip.innerHTML = "Cliquez sur un papier pour afficher son nom ici."; // Reset the text
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
    const papers = removeDuplicatePapers(
      jsonData.papers.filter((paper) => activePaperIds.has(paper.paperId))
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
      paperItem.dataset.paperId = paper.paperId;
      paperItem.dataset.citationCount = paper.citationCount;

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

      paperItem.addEventListener("click", () => {
        const node = d3
          .selectAll("circle")
          .filter((d) => d.paperId === paper.paperId);

        if (!node.empty()) {
          handleNodeClick(
            node,
            node.datum(),
            JSON.parse(
              document.querySelector(".paper-button.active").dataset.json
            )
          );
        }
      });

      titleList.appendChild(paperItem);
    });

    // Update the papers count
    papersCount.textContent = papers.length;
  }

  function getUniqueCitationValues(papers) {
    const citationCounts = papers.map((paper) => {
      return paper.citationCount != null ? paper.citationCount : 0; // Replace null/undefined with 0
    });
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

    const validLinks = filteredLinks.filter(
      (link) => link.source && link.target
    );

    const citationScale = d3
      .scaleSqrt()
      .domain([0, d3.max(filteredPapers, (d) => d.citationCount)])
      .range([10, 60]);

    const colorScaleBlue = d3
      .scaleSequential()
      .domain([0, d3.max(filteredPapers, (d) => d.citationCount)])
      .interpolator(d3.interpolateRgb("navy", "cyan"));

    const colorScaleGreen = d3
      .scaleSequential()
      .domain([0, d3.max(filteredPapers, (d) => d.citationCount)])
      .interpolator(d3.interpolateRgb("darkgreen", "lightgreen"));

    simulation = d3
      .forceSimulation(filteredPapers)
      .force(
        "link",
        d3
          .forceLink(validLinks)
          .id((d) => d.paperId)
          .distance(200)
      )
      .force("charge", d3.forceManyBody().strength(-1000)) // Increase negative value for stronger repulsion
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(validLinks)
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
      .attr("fill", (d) => {
        // Check if the paper is from queries or queries_more
        const isInQueries = Object.values(data.queries).some((papers) =>
          papers.includes(d.paperId)
        );
        const isInQueriesMore = Object.values(data.queries_more).some(
          (papers) => papers.includes(d.paperId)
        );

        if (isInQueries) {
          return colorScaleGreen(d.citationCount);
        } else if (isInQueriesMore) {
          return colorScaleBlue(d.citationCount);
        }
        return "#ccc"; // Default color if not found in either
      })
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
        handleNodeClick(d3.select(this), d, data);
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
      .style("text-shadow", "0 0 1rem rgba(0, 0, 0, 1)")
      .text((d) => {
        const firstAuthorId = d.authorIds[0];
        const firstAuthor = data.authors[firstAuthorId] || "Unknown";
        const year = new Date(d.publicationDate).getFullYear();

        // Only split if firstAuthor is a string
        return typeof firstAuthor === "string"
          ? `${firstAuthor.split(" ").pop()} ${year}`
          : `${firstAuthor} ${year}`;
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

      text.attr("x", (d) => d.x).attr("y", (d) => d.y);

      // Update tooltip position to follow the clicked node
      if (clickedNode) {
        updateTooltipPosition(clickedNode.datum());
      }
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

    // Reset the paper list classes after the graph is updated
    resetPaperListClasses();
  }

  function handleNodeClick(selectedNode, nodeData, graphData) {
    // Check if the clicked node is already selected
    if (clickedNode && clickedNode.node() === selectedNode.node()) {
      // If the same node is clicked again, reset visibility for all nodes, links, texts, and paper list items
      svg.selectAll("circle").style("opacity", 1);
      svg.selectAll("line").style("opacity", 1);
      svg.selectAll("text").style("opacity", 1);
      document.querySelectorAll(".paper-item").forEach((item) => {
        item.classList.remove("inactive", "selected"); // Remove both inactive and selected classes
      });
      clickedNode = null;
      nodeTooltip.style.display = "none"; // Hide the tooltip

      // Reset the paper list classes when the same paper is clicked again
      resetPaperListClasses();
    } else {
      // Dim all nodes, links, texts, and paper list items
      svg.selectAll("circle").style("opacity", 0.1);
      svg.selectAll("line").style("opacity", 0.1);
      svg.selectAll("text").style("opacity", 0);
      document.querySelectorAll(".paper-item").forEach((item) => {
        item.classList.add("inactive");
        item.classList.remove("selected"); // Remove the selected class from all items
      });

      // Highlight the selected node and its related nodes and links
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

      if (relatedNodes.size === 0) {
        // If the node has no links (case where it is the only active node)
        selectedNode.style("opacity", 1);
        svg
          .selectAll("text")
          .filter((d) => d === nodeData)
          .style("opacity", 1);

        document.querySelectorAll(".paper-item").forEach((item) => {
          if (item.dataset.paperId === nodeData.paperId) {
            item.classList.remove("inactive");
            item.classList.add("selected"); // Add the selected class
          }
        });
      } else {
        // Otherwise, proceed normally with related nodes and links
        relatedNodes.forEach((node) => {
          svg
            .selectAll("circle")
            .filter((d) => d === node)
            .style("opacity", 1);
          svg
            .selectAll("text")
            .filter((d) => d === node)
            .style("opacity", 1);

          // Highlight corresponding papers in the paper list
          document.querySelectorAll(".paper-item").forEach((item) => {
            if (item.dataset.paperId === node.paperId) {
              item.classList.remove("inactive");
            }
          });
        });

        selectedNode.style("opacity", 1);
        relatedLinks.style("opacity", 1);
      }

      clickedNode = selectedNode;

      // Highlight the corresponding paper and scroll to it
      const paperId = nodeData.paperId;
      const paperItem = document.querySelector(
        `.paper-item[data-paper-id="${paperId}"]`
      );

      if (paperItem) {
        paperItem.classList.add("selected");
        paperItem.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Show and update the tooltip with details of the clicked node
      displayTooltip(nodeData, graphData.authors);
      updateTooltipPosition(nodeData);
    }
  }

  function displayTooltip(paperData, authorsData) {
    const authorsList = paperData.authorIds
      .map((authorId) => authorsData[authorId] || "Unknown Author")
      .join(", ");

    const tooltipHTML = `
            <h3>${paperData.title}</h3>
            <p><strong>${authorsList}</strong></p>
            <br>
            <div style="display: flex; justify-content: space-between; width: 100%;">
              <span>${new Date(
                paperData.publicationDate
              ).toLocaleDateString()}</span>
              <span>${paperData.citationCount}</span>
            </div>
        `;

    nodeTooltip.innerHTML = tooltipHTML;
    nodeTooltip.style.display = "block";
  }

  function updateTooltipPosition(nodeData) {
    if (!nodeData) return;

    const transformed = currentTransform.apply([nodeData.x, nodeData.y]);

    const tooltipWidth = nodeTooltip.offsetWidth;
    const tooltipHeight = nodeTooltip.offsetHeight;
    const containerRect = graphContainer.node().getBoundingClientRect();
    const offsetX = 10; // Horizontal offset from the node
    const offsetY = -10; // Vertical offset from the node

    // Calculate the tooltip's position
    let left = transformed[0] + containerRect.left + offsetX;
    let top = transformed[1] + containerRect.top + offsetY - tooltipHeight;

    // Ensure the tooltip doesn't go out of bounds
    left = Math.max(
      containerRect.left,
      Math.min(left, containerRect.right - tooltipWidth)
    );
    top = Math.max(
      containerRect.top,
      Math.min(top, containerRect.bottom - tooltipHeight)
    );

    nodeTooltip.style.left = `${left}px`;
    nodeTooltip.style.top = `${top}px`;
    nodeTooltip.style.pointerEvents = "none"; // Allow clicks to pass through
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

    // Choice between queries and queries_more based on the current mode
    const queriesSource =
      currentDepth === 0 ? jsonData.queries : jsonData.queries_more;

    activeQueries.forEach((query) => {
      const paperIds = queriesSource[query];
      if (paperIds) {
        paperIds.forEach((id) => activePaperIds.add(id));
      }
    });
    return activePaperIds;
  }

  function removeDuplicatePapers(papers) {
    const seen = new Set();
    return papers.filter((paper) => {
      if (seen.has(paper.paperId)) {
        return false;
      } else {
        seen.add(paper.paperId);
        return true;
      }
    });
  }
});
