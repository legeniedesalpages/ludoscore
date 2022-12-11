<!doctype html>
<html lang="fr">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <title>Deploiment LudoScore</title>
</head>

<body>
    <h1>Déploiement Ludoscore / Install</h1>
    <?php

    $zip_deploiment = './back.zip';
    echo "<hr/>";
    echo "Recherche du fichier $zip_deploiment<br/>";

    $zip = new ZipArchive;
    $res = $zip->open($zip_deploiment);
    if ($res === TRUE) {
        echo "Archive trouvée $zip_deploiment<br/>";
        $time_start2 = microtime(true);
        $zip->extractTo('../../.');
        $zip->close();
        $time_end2 = microtime(true);
        $execution_time2 = ($time_end2 - $time_start2);
        echo '<b>Décompression en :</b> ' . $execution_time2 . ' Secondes<br/>';
    } else {
        echo "Archive introuvable : $zip_deploiment";
    }
    
    echo "<hr/>";
    echo "Renommage du repertoire";
    rename('../../back', '../../ludoscore');
    
    echo "<hr/>";
    echo "Copie du .env";
    copy("./.env", "../../ludoscore/.env");
    
    echo "<hr/>";
    echo "Copie du repertoire public";
    rename("./public", "../ludoscore");
    
    echo "<hr/>";
    echo "<h2>Fin</h2>";

    ?></b>
</body>

</html>