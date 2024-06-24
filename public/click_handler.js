document.addEventListener('DOMContentLoaded', () => {
    const jsonContent = document.getElementById('json-content');

    jsonContent.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            const title = event.target.dataset.title;
            const fileName = event.target.dataset.fileName;
            alert(`Title: ${title}\nFile: ${fileName}`);
        }
    });
});
