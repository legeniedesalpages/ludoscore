<html>
<style>
    .banner {
        height: 80px;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
        background-color: #2196f3;
        color: white;
    }

    svg {
        height: 125px;
        width: 125px;
    }

    .dice {
        position: absolute;
        right: -20px;
        bottom: -40px;
        opacity: 0.2;
        overflow: hidden;
    }

    .title {
        text-align: center;
        font-size: 30px;
        font-weight: 400;
        z-index: 1;
    }
    .pseudo {
        font-weight: bold;
    }
</style>

<body>
    <div class="banner">
        <div class="dice">
            <svg viewBox="0 0 512 512">
                <g transform="translate(0,0)">

                    <path fill="#000" d="M255.76 44.764c-6.176 0-12.353 1.384-17.137 4.152L85.87 137.276c-9.57 5.536-9.57 14.29 0 19.826l152.753 88.36c9.57 5.536 24.703 5.536 34.272 0l152.753-88.36c9.57-5.535 9.57-14.29 0-19.825l-152.753-88.36c-4.785-2.77-10.96-4.153-17.135-4.153zm.926 82.855a31.953 18.96 0 0 1 22.127 32.362 31.953 18.96 0 1 1-45.188-26.812 31.953 18.96 0 0 1 23.06-5.55zM75.67 173.84c-5.753-.155-9.664 4.336-9.664 12.28v157.696c0 11.052 7.57 24.163 17.14 29.69l146.93 84.848c9.57 5.526 17.14 1.156 17.14-9.895V290.76c0-11.052-7.57-24.16-17.14-29.688l-146.93-84.847c-2.69-1.555-5.225-2.327-7.476-2.387zm360.773.002c-2.25.06-4.783.83-7.474 2.385l-146.935 84.847c-9.57 5.527-17.14 18.638-17.14 29.69v157.7c0 11.05 7.57 15.418 17.14 9.89L428.97 373.51c9.57-5.527 17.137-18.636 17.137-29.688v-157.7c0-7.942-3.91-12.432-9.664-12.278zM89.297 195.77a31.236 18.008 58.094 0 1 33.818 41.183 31.236 18.008 58.094 1 1-45-25.98 31.236 18.008 58.094 0 1 11.182-15.203zm221.52 64.664A18.008 31.236 31.906 0 1 322 275.637a18.008 31.236 31.906 0 1-45 25.98 18.008 31.236 31.906 0 1 33.818-41.183zM145.296 289.1a31.236 18.008 58.094 0 1 33.818 41.183 31.236 18.008 58.094 0 1-45-25.98 31.236 18.008 58.094 0 1 11.182-15.203zm277.523 29.38A18.008 31.236 31.906 0 1 434 333.684a18.008 31.236 31.906 0 1-45 25.98 18.008 31.236 31.906 0 1 33.818-41.184zm-221.52 64.663a31.236 18.008 58.094 0 1 33.817 41.183 31.236 18.008 58.094 1 1-45-25.98 31.236 18.008 58.094 0 1 11.182-15.203z">
                    </path>
                </g>
            </svg>
        </div>

        <span class="title">Ludo Score</span>
    </div>
    <br/>
    Bienvenue sur LudoScore<br>
    <br/>
    Vous avez demandé la création d'un compte pour l'application LudoScore. <br>
    Pour confirmer cette création, veuillez cliquer sur le lien suivant : <a href="{{$url}}">confirmer mon compte</a><br/>
    <br/>
    Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer ce mail.<br>
    <br/>
    A bientôt sur LudoScore !<br>
</body>

</html>