<?php
    // Define the directory containing JSON files
    $dir = 'jsons';

    // Scan the directory and exclude '.' and '..' from the list
    $files = array_diff(scandir($dir), array('.', '..'));

    // Filter the files to only include those with a '.json' extension
    $jsonFiles = array_filter($files, function($file) use ($dir) {
        return pathinfo($file, PATHINFO_EXTENSION) === 'json';
    });

    $result = [];
    // Extract titles from each JSON file
    foreach ($jsonFiles as $file) {
        $filePath = "$dir/$file";
        $jsonData = json_decode(file_get_contents($filePath), true);
        $title = $jsonData['title'] ?? 'No title'; // Default to 'No title' if not set
        $result[] = [
            'title' => $title,
            'file' => $file // Include the file name for reference
        ];
    }

    // Encode the list of JSON files to a JSON format and output it
    echo json_encode($result);
?>
