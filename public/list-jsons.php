<?php
    // Define the directory containing JSON files
    $dir = 'jsons';

    // Scan the directory and exclude '.' and '..' from the list
    $files = array_diff(scandir($dir), array('.', '..'));

    // Filter the files to only include those with a '.json' extension
    $jsonFiles = array_filter($files, function($file) use ($dir) {
        return pathinfo($file, PATHINFO_EXTENSION) === 'json';
    });

    // Encode the list of JSON files to a JSON format and output it
    echo json_encode(array_values($jsonFiles));
?>
