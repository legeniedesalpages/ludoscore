<!doctype html>
<html lang="fr">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <title>Deploiment LudoScore</title>
</head>

<body>
    <h1>Déploiement Ludoscore</h1>
    <hr />
    <?php

    $install_dir = '../../ludoscore';
    echo "Suppression d'une précédente installation : $install_dir<br/>";

    $time_start = microtime(true);
    rrmdir($install_dir);
    rrmdir('../../back');
    rrmdir('../ludoscore');
    $time_end = microtime(true);
    $execution_time = ($time_end - $time_start);
    echo '<b>Suppression en :</b> ' . $execution_time . ' Secondes<br/>';

    echo "<hr/>";
    echo "<h2>Fin</h2>";

    function rrmdir($dir)
    {
        ob_flush();
        flush();

        if (is_dir($dir)) {
            $objects = scandir($dir);

            foreach ($objects as $object) {
                if ($object != '.' && $object != '..') {
                    if (filetype($dir . '/' . $object) == 'dir') {
                        rrmdir($dir . '/' . $object);
                    } else {
                        unlink($dir . '/' . $object);
                    }
                }
            }

            reset($objects);
            rmdir($dir);
        }
    }
    ?></b>
</body>

</html>