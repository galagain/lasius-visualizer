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

        // Fetch each JSON file and display its title
        for (const file of jsonFiles) {
            const filePath = `/jsons/${file}`;
            const fileResponse = await fetch(filePath);
            if (!fileResponse.ok) {
                throw new Error(`Failed to fetch ${filePath}: ${fileResponse.statusText}`);
            }
            const jsonData = await fileResponse.json();
            const title = jsonData.title || 'No title'; // Assume each JSON has a 'title' field
            const titleElement = document.createElement('div');
            titleElement.textContent = title;
            container.appendChild(titleElement);
        }
    } catch (error) {
        console.error('Error:', error);
        container.textContent = 'Failed to load JSON files.';
    }
}

// Call the function to display JSON titles
displayJSONTitles();