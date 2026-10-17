<html>
<body style="font-family: Arial, sans-serif; color: #222; max-width: 640px; margin: 0 auto;">
    <div style="padding: 24px; background-color: #2196f3; color: white; text-align: center; font-size: 28px;">Ludo Score</div>

    <h2>Votre semaine en jeux</h2>
    <p>{{ $newsletter['summary'] }}</p>
    @if (!empty($newsletter['stats']))
        <p style="color: #555;">
            {{ $newsletter['stats']['parties'] ?? 0 }} partie(s) &middot;
            {{ intdiv($newsletter['stats']['minutes_de_jeu'] ?? 0, 60) }} h {{ ($newsletter['stats']['minutes_de_jeu'] ?? 0) % 60 }} min de jeu
        </p>
    @endif

    @if (!empty($newsletter['suggestions']))
        <h2>À jouer cette semaine</h2>
        <p style="color: #555;">Lune : {{ $newsletter['moon']['phase'] }}</p>
        <ul>
            @foreach ($newsletter['suggestions'] as $suggestion)
                <li><strong>{{ $suggestion['game'] }}</strong> : {{ $suggestion['reason'] }}</li>
            @endforeach
        </ul>
    @endif

    @if (!empty($newsletter['story']))
        <h2>La petite histoire</h2>
        @foreach ($newsletter['story'] as $paragraph)
            <p>{{ $paragraph }}</p>
        @endforeach
    @endif

    @if (!empty($newsletter['throwback']))
        <h2>À la même époque, les années passées</h2>
        <p>{{ $newsletter['throwback'] }}</p>
    @endif

    @if (!empty($newsletter['epic']))
        <h2>{{ $newsletter['epic']['title'] }}</h2>
        <p style="color: #555; font-size: 13px;">
            Récit imaginaire d'une vraie partie de {{ $newsletter['epic']['game'] }} ({{ \Carbon\Carbon::parse($newsletter['epic']['date'])->format('d/m/Y') }})
            @if (!empty($newsletter['epic']['tone'])) &middot; {{ $newsletter['epic']['tone'] }} @endif
        </p>
        @foreach ($newsletter['epic']['paragraphs'] as $paragraph)
            <p>{{ $paragraph }}</p>
        @endforeach
    @endif

    <p style="color: #888; font-size: 12px;">Cette newsletter est générée automatiquement par LudoScore.</p>
</body>
</html>
