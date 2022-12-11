<?php

	$data = json_decode(file_get_contents('php://input'), true);
	$myfile = fopen("newfile.txt", "w") or die("Unable to open file!");
	$txt  = "APP_NAME=\"".htmlspecialchars($data["APP_NAME"])."\"\n";
	$txt .= "APP_ENV=".htmlspecialchars($data["APP_ENV"])."\n";
	$txt .= "APP_KEY=".htmlspecialchars($data["APP_KEY"])."\n";
	$txt .= "APP_DEBUG=".htmlspecialchars($data["APP_DEBUG"])."\n";
	$txt .= "APP_URL=".htmlspecialchars($data["APP_URL"])."\n";
	$txt .= "LOG_CHANNEL=".htmlspecialchars($data["LOG_CHANNEL"])."\n";
	$txt .= "LOG_DEPRECATIONS_CHANNEL=".htmlspecialchars($data["LOG_DEPRECATIONS_CHANNEL"])."\n";
	$txt .= "LOG_LEVEL=".htmlspecialchars($data["LOG_LEVEL"])."\n";
	$txt .= "DB_HOST=".htmlspecialchars($data["DB_HOST"])."\n";
	$txt .= "DB_PORT=".htmlspecialchars($data["DB_PORT"])."\n";
	$txt .= "DB_DATABASE=".htmlspecialchars($data["DB_DATABASE"])."\n";
	$txt .= "DB_USERNAME=".htmlspecialchars($data["DB_USERNAME"])."\n";
	$txt .= "DB_PASSWORD=".htmlspecialchars($data["DB_PASSWORD"])."\n";
	$txt .= "DB_PREFIX=".htmlspecialchars($data["DB_PREFIX"])."\n";
	fwrite($myfile, $txt);
	fclose($myfile);