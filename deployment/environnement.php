<?php

	$myfile = fopen("newfile.txt", "w") or die("Unable to open file!");
	$txt  = "APP_NAME".htmlspecialchars($_GET["APP_NAME"])."\n";
	$txt .= "APP_ENV".htmlspecialchars($_GET["APP_ENV"])."\n";
	$txt .= "APP_KEY".htmlspecialchars($_GET["APP_KEY"])."\n";
	$txt .= "APP_DEBUG".htmlspecialchars($_GET["APP_DEBUG"])."\n";
	$txt .= "APP_URL".htmlspecialchars($_GET["APP_URL"])."\n";
	$txt .= "LOG_CHANNEL".htmlspecialchars($_GET["LOG_CHANNEL"])."\n";
	$txt .= "LOG_DEPRECATIONS_CHANNEL".htmlspecialchars($_GET["LOG_DEPRECATIONS_CHANNEL"])."\n";
	$txt .= "LOG_LEVEL".htmlspecialchars($_GET["LOG_LEVEL"])."\n";
	$txt .= "DB_HOST".htmlspecialchars($_GET["DB_HOST"])."\n";
	$txt .= "DB_PORT".htmlspecialchars($_GET["DB_PORT"])."\n";
	$txt .= "DB_DATABASE".htmlspecialchars($_GET["DB_DATABASE"])."\n";
	$txt .= "DB_USERNAME".htmlspecialchars($_GET["DB_USERNAME"])."\n";
	$txt .= "DB_PASSWORD".htmlspecialchars($_GET["DB_PASSWORD"])."\n";
	$txt .= "DB_PREFIX".htmlspecialchars($_GET["DB_PREFIX"])."\n";
	fwrite($myfile, $txt);
	fclose($myfile);