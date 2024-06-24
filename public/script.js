async function displayJSONTitles() {
    const container = document.getElementById('json-content');
    container.innerHTML = ''; // Clear previous content

    try {
        // Fetch the list of JSON files from the server
        const response = await fetch('/list-jsons');
        if (!response.ok) {
            throw new Error(`Failed to fetch list of JSON files: ${response.statusText}`);
        }
        const jsonFiles = await response.json();

        // Create a button for each JSON title
        jsonFiles.forEach(fileData => {
            const button = document.createElement('button');
            button.textContent = fileData.title;
            button.onclick = () => alert(`Title: ${fileData.title}\nFile: ${fileData.file}`);
            container.appendChild(button);
        });
    } catch (error) {
        console.error('Error:', error);
        container.textContent = 'Failed to load JSON files.';
    }
}

// Call the function to display JSON titles
displayJSONTitles();