document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const buttonContainer = document.getElementById("button-container");

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragging");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragging");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragging");
    handleFiles(e.dataTransfer.files);
  });

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  function handleFiles(files) {
    Array.from(files).forEach((file) => {
      if (file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const jsonData = JSON.parse(e.target.result);
            const title = jsonData.title || "No title";
            const button = document.createElement("button");
            button.textContent = title;
            button.dataset.json = JSON.stringify(jsonData);
            button.className = "paper-button";
            buttonContainer.appendChild(button);
          } catch (error) {
            alert("Error reading JSON file.");
          }
        };
        reader.readAsText(file);
      } else {
        alert("Please drop valid JSON files.");
      }
    });
  }
});
