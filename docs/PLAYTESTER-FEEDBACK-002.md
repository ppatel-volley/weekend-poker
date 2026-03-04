# Playtester Feedback Report #002

> **Date:** 2026-03-03
> **Reviewer:** Casual playtester (30yo, weekly game nights, some casino experience)
> **Build:** v2.2 (all 7 games, Game Night, retention system)
> **Previous report:** #001 (2026-02-28)

---

## Report #001 Issue Status

### 1. QR code placeholder -- FIXED
The QR code is now fully functional. The display lobby (`LobbyView.tsx`) renders a real `QRCodeSVG` that encodes the controller URL with the session ID. The in-game HUD (`CasinoHUD.tsx`) also shows a clickable QR code in the top-right corner with a "Join (X/4)" counter that hides when the table is full. Well done -- this is exactly what was needed.

### 2. Raw phase names shown to players -- FIXED
A comprehensive `PHASE_LABELS` map now exists in `packages/shared/src/constants/phase-labels.ts` with human-friendly labels for every single phase across all 7 games. The Hold'em controller uses `getPhaseLabel(phase)`. That said, the **Craps display scene** still does its own formatting via `formatPhase()` which just strips the `CRAPS_` prefix and replaces underscores with spaces (e.g., "COME OUT BETTING"), rather than using the shared label system ("Come-Out Bets"). Minor inconsistency but not as bad as raw enum names.

### 3. 5-Card Draw didn't show card values in discard -- FIXED
The `DiscardView` in `FiveCardDrawController.tsx` now shows full card rank and suit for unselected cards. Selected cards show an "X" with a red highlight and lift animation (`translateY(-8px)`). Cards display rank and a letter abbreviation for the suit (S/H/D/C). The instruction text "Tap cards to select for discard" is clear. Good fix.

### 4. No game switching mid-session -- STILL OPEN
There is still no UI for switching games during a session. The `GameRouter` derives the current game from phase but there is no "Change Game" or "Back to Lobby" button accessible during gameplay. Players are locked into whatever game they chose until it ends. For a casual party night, this is frustrating.

### 5. "Stand Pat" jargon -- FIXED
The button in the Draw discard view now reads "KEEP ALL CARDS" (`data-testid="keep-all-btn"`). The voice intent still uses `stand_pat` internally but the pattern also matches "keep all" and "keep them", so players can say natural phrases. Perfect fix.

### 6. All buttons visible at once in Draw -- PARTIALLY FIXED
The Draw controller now properly separates into distinct phase views: `BettingView` for betting phases, `DiscardView` for the draw phase, and `ResultsView` for showdown. So you only see betting buttons during betting and discard UI during the draw phase. However, within the betting view itself, all four buttons (Fold, Check/Call, Raise, All In) still render simultaneously in a 2x2 grid, even when some are logically redundant. The Raise button does at least get disabled when the player cannot afford it. This is better than before but not as clean as Hold'em's context-sensitive layout.

### 7. No voice feedback confirmation -- STILL OPEN
The `VoiceButton` component shows "Listening..." while recording and the transcript text when done, but there is no visual or textual confirmation of *what action was taken* after the voice command is processed. You say "raise fifty" and see the transcript briefly, but you do not know if the server actually interpreted it as a raise. No toast, no "Action: RAISE $50" feedback. Still confusing.

### 8. "Hit me" not recognised -- FIXED
The voice parser now explicitly matches `hit\s*(me)?` as `bj_hit`. Tests confirm "hit me" maps to `bj_hit`. Also added "gimme a card" and "card" as aliases. The `processVoiceCommand` routes these to `bjHit` during `BJ_PLAYER_TURNS`. Casual phrases like "I'm in" (TCP play) and "I'm out" (TCP fold) are also now supported.

### 9. No tutorial/rules summary -- STILL OPEN
There is no in-game tutorial, rules summary, or help screen anywhere in the controller or display code. The only guidance players get is the game descriptions in the lobby grid (e.g., "Beat the dealer to 21"). For games like Three Card Poker and Craps, where casual players absolutely need to understand the rules, this is a real problem.

### 10. No hand strength indicator -- STILL OPEN
No hand strength evaluation or display exists in any controller. The Hold'em controller shows hole cards but no "You have: Pair of Kings" label. The Blackjack controller does show a `HandValueBadge` component with the hand total, soft/hard distinction, and BLACKJACK/BUST labels -- which is excellent for Blackjack. But for poker variants (Hold'em, Draw, TCP), there is no hand ranking indicator whatsoever.

---

## Star Ratings (1-5)

| Game | Fun | Clarity | Pacing | Voice UX | Overall |
|------|-----|---------|--------|----------|---------|
| Texas Hold'em | 4 | 4 | 3 | 3 | 3.5 |
| 5-Card Draw | 3 | 3 | 3 | 2 | 3 |
| Blackjack Classic | 4 | 5 | 4 | 3 | 4 |
| Competitive Blackjack | 4 | 4 | 4 | 3 | 4 |
| Three Card Poker | 3 | 3 | 4 | 2 | 3 |
| Roulette | 4 | 4 | 3 | 3 | 3.5 |
| Craps | 3 | 2 | 3 | 1 | 2.5 |
| Game Night Mode | 4 | 4 | 4 | N/A | 4 |
| **Retention System** | 3 | 3 | 3 | N/A | 3 |

---

## Love It (Things that delight)

- **Lobby design is gorgeous.** The gold-on-dark theme with shimmer animations, glowing dividers, and card suit watermarks on the game buttons feels premium. The logo, the animated ready button, the whole vibe screams "casino night."
- **Blackjack HandValueBadge is exactly right.** Showing "Soft 17", "BLACKJACK", or "BUST" with colour-coded badges is precisely what a casual player needs. No mental arithmetic required. This should be the model for all games.
- **Competitive Blackjack opponent visibility.** Seeing opponents' card counts, bust status, and hand values once they stand creates real tension. The "Waiting for [name]..." turn indicator makes the multiplayer aspect feel alive.
- **Craps shooter button.** The big pulsing golden ROLL button is theatrical and fun. Feels like you are actually stepping up to the table. The dice display on the TV with pip faces is satisfying.
- **Roulette two-tab layout.** Quick Bets for casual play (Red/Black/Odd/Even) and a full Number Grid for the keeners is a smart split. The chip selector and Repeat Last button show thoughtful UX.
- **QR code join system now works properly.** Both the lobby QR and the in-game HUD QR with player count are excellent. The "Join (2/4)" label is clear.
- **Game Night leaderboard.** Gold-accented rankings with score-per-game breakdowns and "Next Game: [name]" indicator builds anticipation. The champion ceremony with share button is a nice social touch.
- **Reaction emojis.** The floating animation overlay on the TV is fun during moments of tension. Six reaction options is enough without being overwhelming.
- **Daily bonus popup.** The slide-down animation with streak counter and multiplier badge is a satisfying "welcome back" moment.
- **Controller tab bar.** Having Profile, Challenges, and Cosmetics accessible during gameplay without leaving the session is smart. You can check your stats between hands.
- **Player info header.** Seeing your name, connection status, and wallet balance persistently at the top of the controller is useful and unobtrusive.
- **Phase labels are human-readable.** "Pre-Flop", "Place Your Bets", "Play or Fold" -- all natural language now.

---

## Confused (Things a casual player wouldn't understand)

- **Craps terminology everywhere.** "COME", "DON'T COME", "PLACE BETS", "FIELD", "PASS ODDS" -- none of this is explained. A casual player who has never played craps (most people) would stare at the betting screen completely lost. The Come-Out vs Point betting phases are also confusing without context.
- **Three Card Poker "Pair Plus" checkbox.** What is Pair Plus? Why would I want it? There is no tooltip, no explanation, just a checkbox and a dropdown. The results screen says "DEALER QUALIFIES" / "DEALER DOES NOT QUALIFY" with a small note about Queen-high, but a newbie would not understand why dealer qualification matters.
- **"Ante" in Three Card Poker and Competitive Blackjack.** Casual players know "bet", not "ante." The word "ante" appears without explanation -- "CONFIRM ANTE" would confuse my mum.
- **5-Card Draw suit abbreviations.** Cards show rank + letter (e.g., "K" + "S" for King of Spades). Hold'em shows actual Unicode suit symbols. Why the inconsistency? Letters like "S", "H", "D", "C" are less immediately recognisable than the actual symbols.
- **Roulette "favourite numbers."** The Quick Bets tab shows a "MY NUMBERS" section if the player has favourite numbers set, but there is no way visible in the UI to actually set favourite numbers. Where does this come from?
- **Competitive Blackjack opponent IDs.** The `OpponentSummary` component shows `opponent.playerId.slice(0, 8)` -- a truncated UUID. If the opponent has not set a display name, you see gibberish like "a3f8b2c1" instead of "Player 2."
- **Craps "Add Odds" button.** Only appears when you have a Pass Line bet, but there is zero explanation of what odds bets are or why you would want them. This is an advanced craps concept thrown at beginners.
- **Per-game stats in Profile use raw game keys.** The `GameStatRow` component shows `game.replace(/_/g, ' ')` which produces "five card draw" and "blackjack classic" -- lowercase, no proper formatting. Should use `CASINO_GAME_LABELS`.
- **Cosmetics "unlockedBy" text.** Locked cosmetics show `item.unlockedBy.replace(/_/g, ' ')` which produces raw achievement IDs like "first win" or "play 100 hands" -- not user-friendly achievement names.

---

## Frustrated (Things that annoy or slow down play)

- **CRAPS IS NOT IN THE LOBBY.** The `LobbyController` only imports `V1_GAMES` and `V2_0_GAMES`. Craps (which is in `V2_1_GAMES`) is completely absent from the game selection grid. You literally cannot select Craps from the lobby. This is a showstopper bug -- an entire game is unreachable.
- **No way to leave a game mid-session.** Once a game starts, there is no "Back to Lobby" or "Quit" button. If I start a Blackjack game and want to switch to Roulette, I am stuck. The only option is presumably to close and reopen the browser.
- **Voice gives no feedback on what happened.** I say "raise fifty" and the transcript shows briefly, then it goes back to "Hold to Talk." Did it work? Was the amount right? Was the action taken? No confirmation at all.
- **Craps has no voice support at the controller level.** The voice parser has generic poker intents and roulette intents, but NO craps-specific intents. You cannot say "pass line" or "field bet" and have it do anything. For the most complex game in the casino, this is a painful gap.
- **Hold'em push-to-talk is duplicated.** The `ControllerGameplay` component has its own voice button at the bottom, AND the `ConnectedController` wraps the `GameRouter` with a separate `VoiceButton` component. That means Hold'em potentially has TWO voice buttons stacked. Other games only see the outer one.
- **Game Night button hardcodes first 3 games.** The "GAME NIGHT" button in the lobby dispatches `gnInitGameNight` with `[...V1_GAMES, ...V2_0_GAMES].slice(0, 3)` -- hardcoded to the first three games (Hold'em, Draw, Blackjack Classic). It skips the Setup screen entirely, bypassing the host's ability to choose games, rounds, and theme. This completely undermines the purpose of `GameNightSetupController`.
- **No "Next Hand" or "Continue" button between rounds.** After a hand completes in most games (Hold'em, Draw, Blackjack), the results just sit there. There is no player-facing indication of how the next round starts or when. Auto-advance happens server-side but the player has no control or visibility.
- **Challenges view fetches via raw HTTP.** The `ChallengesView` makes a `fetch()` call to `http://localhost:3000/api/challenges/...`. If the server URL is not configured, this just fails silently with a generic error message.
- **Cosmetics are abstract.** Locked items show a padlock emoji and "unlocked by [raw string]". Owned items show a category icon (playing card back, green square, picture frame). But there are no actual preview images -- the "previewKey" field exists in the type but is never used to render a visual. So you are equipping invisible cosmetics.

---

## Missing (Features a player would expect)

- **Rules/Help screen per game.** Every casino game should have an accessible "How to Play" summary. Craps and Three Card Poker especially need this. Even a one-paragraph explanation with basic strategy tips.
- **Hand strength indicator for poker.** "You have: Two Pair, Kings and Fours" or "You have: Straight, 8-high." Without this, casual players just stare at five cards trying to remember what beats what.
- **Sound effects.** No audio whatsoever. Card dealing, chip stacking, dice rolling, wheel spinning, "no more bets" announcements -- the entire auditory experience is missing. The TV display is silent.
- **Animations on the TV for most games.** Roulette has a 3D wheel model but no spinning animation. The Craps scene is a 2D HTML overlay (admitted as "MVP" in the code comments). Hold'em has 3D models for the table, but dealing and chip animations are unclear. Blackjack display scenes exist but were not reviewed in detail.
- **Bet confirmation for Craps.** After placing a Pass Line bet, the Confirm Bets button confirms but there is no visual feedback on the controller that bets were accepted. A brief toast or highlight would help.
- **Player avatars.** The lobby says "Avatar selection coming soon" and the `PlayerInfo` component shows a circle with the first letter of the player's name. After v2.2, still just a placeholder.
- **Chat or text messaging.** Beyond reactions (6 emoji types), there is no way to communicate with other players. Even a quick-chat wheel with preset phrases ("Nice hand!", "Hurry up!", "Good game") would add social flavour.
- **Spectator mode.** No way for someone to watch without playing. If a 5th person shows up to your poker night, they are out of luck.
- **Settings or configuration during gameplay.** No way to adjust blinds, bet limits, turn timers, or table rules once a game has started.
- **Craps "Don't Pass Odds", "Don't Come Odds", or "Come Odds" on controller.** The display scene has labels for these bet types, and the shared types support them, but the controller betting views only show Pass Line, Don't Pass, Field, Come, Don't Come, Place, and Pass Odds. Half the odds bets are missing from the UI.
- **Blackjack card counting prevention notice.** Not important for casual play but for competitive integrity, no mention of how many decks or shoe penetration.

---

## Suggestions (Quick wins)

- **Add Craps to the lobby game list.** Import `V2_1_GAMES` in `LobbyController.tsx` and include it in the game grid. Also add a suit icon for craps to the `gameCardSuits` map. Probably 5 minutes of work. This is a critical bug fix.
- **Fix the Game Night button to route to Setup.** Instead of hardcoding 3 games, dispatch a phase change to `GN_SETUP` so the host can use the `GameNightSetupController` properly.
- **Use Unicode suit symbols consistently.** Replace `{ spades: 'S', hearts: 'H', diamonds: 'D', clubs: 'C' }` in Draw, Blackjack, Competitive BJ, and TCP controllers with the actual Unicode symbols used in Hold'em. Five files, 10 minutes.
- **Add one-line tooltips for confusing bets.** In the Craps controller, add a small grey subtitle under each bet button: "PASS LINE" -> "Win on 7/11, lose on 2/3/12". "FIELD" -> "Win if next roll is 2,3,4,9,10,11,12". Takes the mystery out of the game.
- **Voice action confirmation toast.** After the voice intent is processed, briefly show "Raised to $50" or "Hit!" at the top of the controller for 2 seconds. Simple state update, no new infrastructure.
- **Use CASINO_GAME_LABELS in the Profile per-game stats.** The `GameStatRow` component should look up the label from the constants instead of doing a string replace on the raw key.
- **Add a "Back to Lobby" button.** Show it in the controller during hand-complete / round-complete phases. Dispatch a reducer to return to game selection.
- **Add craps voice intents.** "Pass line", "don't pass", "field", "come bet", "roll the dice" are obvious phrases that should map to craps actions in `parseVoiceIntent.ts`.
- **Hand strength labels for poker.** Even a simple "Pair", "Two Pair", "Flush" label under the cards in the controller would massively help casual players.
- **Show player names instead of truncated UUIDs.** The Competitive Blackjack `OpponentSummary` should look up `players.find(p => p.id === opponent.playerId)?.name` just like the `ResultsView` does.

---

## Top Priority Issues (PM to triage)

1. **Craps is completely unreachable from the lobby** -- `V2_1_GAMES` is not imported or rendered in `LobbyController.tsx`. An entire game that has been fully built is invisible to players. [Critical bug]

2. **Game Night button bypasses the setup screen** -- Hardcodes first 3 games and 5 rounds instead of routing to `GameNightSetupController`. Renders the entire setup flow useless for the quickstart path. [Significant bug]

3. **No tutorial/rules for any game** -- Craps and Three Card Poker are nearly unplayable for casual players without rule knowledge. Even a single-screen "How to Play" per game would transform the experience. [Major gap]

4. **No "Back to Lobby" or "Quit Game" option** -- Players are trapped in a game with no UI escape. Fundamental UX issue for a party game where you want to hop between activities. [Major gap]

5. **Voice commands have zero feedback** -- Players cannot tell if their voice command was recognised, interpreted correctly, or actually executed. This makes voice feel unreliable and discourages use. [Moderate UX issue]

6. **Card suit symbols are inconsistent across games** -- Hold'em uses Unicode suit symbols; all other games use letter abbreviations (S/H/D/C). Easy fix, big visual improvement. [Low effort, high impact]

7. **No hand strength indicator for poker variants** -- Hold'em, Draw, and TCP players get no help understanding what hand they have. Blackjack does this well with HandValueBadge; poker needs the equivalent. [Moderate effort, high impact]

8. **Craps has no voice commands at all** -- The most complex game with the most terminology has zero voice support. "Pass line", "field", "come" should be recognisable phrases. [Moderate effort]

9. **Cosmetics have no visual previews** -- Players are equipping items they cannot see. The `previewKey` exists in the data but is never rendered. [Moderate effort]

10. **Competitive Blackjack shows truncated UUIDs for opponents** -- When players have not set display names, you see "a3f8b2c1" instead of a fallback like "Player 2." The fix already exists in the ResultsView of the same component but is not applied to OpponentSummary. [Trivial fix]
