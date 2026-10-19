<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://travis-ci.org/laravel/framework"><img src="https://travis-ci.org/laravel/framework.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## BoardGameGeek titles

BGG search and creation details request editions with `versions=1`. Game and
expansion titles prefer the `canonicalname` of a French-language edition
(BGG language ID `2187`). French-only editions take priority over multilingual
editions including French; the first usable title in BGG order is selected.
Without a French edition title, the primary BGG name is used, then the first
available name. Alternate names alone have no language metadata and are not
guessed to be French.

The same selection applies to parent games in expansion results. Creation
prefills this title, which remains editable and is saved as the game's title.
Existing saved titles are never automatically renamed.

Search and creation details share a 24-hour per-item cache under
`bgg.thing.versions.v1.<id>`. This namespace bypasses older cached items that
did not include editions, without clearing unrelated application caches.

## Game expansions

Expansions have a dedicated variant of the game editor.
`games.is_expansion` distinguishes them; editing a saved entry preserves its
type and existing parent links, including when an older client omits the type.

The expansion editor hides duration, minimum/maximum players, cooperative-only,
quantifiable-score and highest-score-wins settings: these remain base-game rules.
The API ignores these fields for expansions (legacy values are preserved but
unused; new entries use neutral compatibility values). `additionalPlayers`
(`games.additional_players`) stores a manually entered non-negative integer,
defaulting to 0, up to 65535. It is not inferred from BGG's total player count.
Other settings such as score categories and draw handling are unchanged.

BGG creation details and saved game details include `baseGameColors`, grouped by
registered compatible base game, regardless of ownership. Each group contains
`bggId`, `title` and `playerColors`. The editor displays these colors read-only
and offers only additional colors for the expansion. `playerColors` on an
expansion stores only its additions; inherited or duplicate color codes are
rejected by the API. Old copied colors matching a parent are removed from the
editable list when loading the form. Editing an expansion never changes its
base games. Colors are read live from the local catalogue, not the BGG cache.

### Expansion tag value changes

Both creation details and saved game details include `baseGameTags`, grouped by
registered compatible parent (`bggId`, `title`, `playerTags`, `matchTags`, `scoreTags`).
The expansion editor can add/remove values from these inherited tags, while
category, uniqueness, occurrence limits and deferred-entry rules remain fixed.
New tags belonging to the expansion still use `playerTags` and `matchTags`.

Only deltas are stored in `games.expansion_tag_changes` (nullable JSON), exposed
as `expansionTagChanges`: a list of `{baseGameBggId, scope, category, addedValues,
removedValues}`, where `scope` is `player` or `match`. Each delta identifies a
single inherited tag by parent BGG ID, scope and exact category name; it never
replaces a parent tag or copies its rules. Empty deltas are discarded. Omitting
the field preserves saved changes for older clients; sending `[]` clears them.
The API rejects unrelated parents, missing/ambiguous categories, duplicate
targets, rule modifications and inconsistent values before writing anything.
Parent tags are read live from the catalogue. If a parent category is removed
or renamed, the editor keeps the saved delta visible with an explicit removal
action; stale values produce a validation error with a reset instruction.

Clicking an inherited tag (marked "(modifié)" when a delta exists) opens a dialog that shows the added/removed values and a reset action.
### Expansion score category changes

Inherited score categories (`baseGameTags[].scoreTags`) can have their
properties modified by an expansion: `min`, `max`, `negatif`, `complex` and
`color`; the category name stays fixed. New categories belonging to the
expansion still use `scoreTags`. Only differing properties are stored in
`games.expansion_score_changes` (nullable JSON), exposed as
`expansionScoreChanges`: a list of `{baseGameBggId, category, properties}`.
Unrelated parents, missing/ambiguous categories, duplicates, unknown properties
and an effective `min` above `max` are rejected; empty changes are dropped.
Omitting the field preserves saved changes; sending `[]` clears them. In the
editor, a modified category is marked "(modifié)" and its dialog lists the
modified properties with a reset action.

This step configures expansions only: choosing expansions when starting a match
and applying their changes to that match remain future work.

On creation, `isExpansion: true` triggers server-side verification against BGG.
All inbound links to actual base games are saved in `game_expansion`, excluding
other expansions (for example, Prelude 2's compatibility links to Venus Next).
The link table has its own ID, timestamps, and a unique
`(extension_id, base_game_bgg_id)` pair for future relationship properties.
Only `extension_id` references a local game. A base game's BGG ID can be stored
before that game exists locally, but at least one compatible base game must
already be in the shared catalogue to save an expansion (personal ownership is
not required). `Game::baseGames()` and `Game::expansions()` resolve additional
parents when they are added. Neither creation of other parents nor addition to
any user's library is automatic. The editor offers links to add missing base
games. Expansions are excluded from match selection and cannot start a match
through the API; selecting expansions for a base-game match is not yet supported.

The catalogue list includes `baseGameBggIds` for each entry. The library groups
extensions under each registered base game with a compact two-line row and an
extension icon. Filters still apply to each entry; a filtered-out parent is shown
as context without being counted as a match. Searching a base game's title also
finds its extensions in the selected category. Multi-parent extensions appear
under each base game, but counters count each entry only once.

Game creation, links, and personal library membership are saved in one database
transaction. BGG lookup failures abort before writing the game.

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

You may also try the [Laravel Bootcamp](https://bootcamp.laravel.com), where you will be guided through building a modern Laravel application from scratch.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains over 2000 video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the Laravel [Patreon page](https://patreon.com/taylorotwell).

### Premium Partners

- **[Vehikl](https://vehikl.com/)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Cubet Techno Labs](https://cubettech.com)**
- **[Cyber-Duck](https://cyber-duck.co.uk)**
- **[Many](https://www.many.co.uk)**
- **[Webdock, Fast VPS Hosting](https://www.webdock.io/en)**
- **[DevSquad](https://devsquad.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel/)**
- **[OP.GG](https://op.gg)**
- **[WebReinvent](https://webreinvent.com/?utm_source=laravel&utm_medium=github&utm_campaign=patreon-sponsors)**
- **[Lendio](https://lendio.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
