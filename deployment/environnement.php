<?php

	$myfile = fopen("newfile.txt", "w") or die("Unable to open file!");
	$txt  = "APP_NAME".htmlspecialchars($_POST["APP_NAME"])."\n";
	$txt .= "APP_ENV".htmlspecialchars($_POST["APP_ENV"])."\n";
	$txt .= "APP_KEY".htmlspecialchars($_POST["APP_KEY"])."\n";
	$txt .= "APP_DEBUG".htmlspecialchars($_POST["APP_DEBUG"])."\n";
	$txt .= "APP_URL".htmlspecialchars($_POST["APP_URL"])."\n";
	$txt .= "LOG_CHANNEL".htmlspecialchars($_POST["LOG_CHANNEL"])."\n";
	$txt .= "LOG_DEPRECATIONS_CHANNEL".htmlspecialchars($_POST["LOG_DEPRECATIONS_CHANNEL"])."\n";
	$txt .= "LOG_LEVEL".htmlspecialchars($_POST["LOG_LEVEL"])."\n";
	$txt .= "DB_HOST".htmlspecialchars($_POST["DB_HOST"])."\n";
	$txt .= "DB_PORT".htmlspecialchars($_POST["DB_PORT"])."\n";
	$txt .= "DB_DATABASE".htmlspecialchars($_POST["DB_DATABASE"])."\n";
	$txt .= "DB_USERNAME".htmlspecialchars($_POST["DB_USERNAME"])."\n";
	$txt .= "DB_PASSWORD".htmlspecialchars($_POST["DB_PASSWORD"])."\n";
	$txt .= "DB_PREFIX".htmlspecialchars($_POST["DB_PREFIX"])."\n";
	fwrite($myfile, $txt);
	fclose($myfile);