import type { LibraryTrack } from './musicLicence';

/**
 * The built-in music catalogue.
 *
 * The library reads tracks from Firestore so it can grow without a release,
 * but that left it empty until someone seeded it — an organizer opening the
 * soundtrack picker saw nothing, which is worse than not offering one. These
 * ship with the app and are merged with whatever Firestore holds.
 *
 * Every entry was selected mechanically rather than by hand:
 *   - the licence is read from the item's own metadata on the Internet
 *     Archive, not assumed from the collection it sits in;
 *   - NonCommercial and NoDerivatives licences are rejected outright, because
 *     this app takes payments and NC would not cover it;
 *   - a named creator is required, since CC BY is unusable without one;
 *   - the file's first bytes were checked to be a real MP3, its length to be
 *     between 90 and 420 seconds, and its size to stay under 4 MB so it fits
 *     through api/audio;
 *   - a label name is not accepted as an artist, since crediting one credits
 *     the wrong party, and titles and artists are restricted to Latin script
 *     because a credit is displayed verbatim and I cannot check a string I
 *     cannot read.
 *
 * What has NOT been verified is how any of it sounds. Taste is not something
 * a licence check can establish — audition them and drop whatever does not
 * suit the app.
 *
 * Audio is hosted on archive.org but reaches the browser through api/audio:
 * the Archive does not send Access-Control-Allow-Origin from every storage
 * node, and on the web expo-audio needs CORS, so playing these directly
 * works or fails depending on which node a request lands on. That was
 * observed, not assumed. See lib/audioSource.
 */
export const BUILT_IN_TRACKS: LibraryTrack[] = [
  {
    id: 'ia-gt458steamflow-withtrainsandbones-d5e0d1',
    title: "Railway To Nowhere",
    artist: "Mad God",
    uri: 'https://archive.org/download/gt458SteamFlow-WithTrainsAndBones/1.RailwayToNowhere.mp3',
    durationSeconds: 180,
    mood: 'Chill',
    licence: 'CC0',
    sourceUrl: 'https://archive.org/details/gt458SteamFlow-WithTrainsAndBones',
  },
  {
    id: 'ia-blunderwood-geo-sync-deluxe-d3d624',
    title: "Mir",
    artist: "BLUnderwood",
    uri: 'https://archive.org/download/BLUnderwood_Geo_Sync_Deluxe/04_Mir_64kb.mp3',
    durationSeconds: 363,
    mood: 'Chill',
    licence: 'CC-BY',
    attribution: "Mir by BLUnderwood (CC BY), via the Internet Archive",
    sourceUrl: 'https://archive.org/details/BLUnderwood_Geo_Sync_Deluxe',
  },
  {
    id: 'ia-every-effect-on-you-38790b',
    title: "Every Effect on You",
    artist: "Mike Carrier",
    uri: 'https://archive.org/download/every_effect_on_you/EveryEffectOnYou.mp3',
    durationSeconds: 172,
    mood: 'Dreamy',
    licence: 'CC-BY',
    attribution: "Every Effect on You by Mike Carrier (CC BY), via the Internet Archive",
    sourceUrl: 'https://archive.org/details/every_effect_on_you',
  },
  {
    id: 'ia-tranz060taletwist-wryway-4944a2',
    title: "Km 001",
    artist: "Tale Twist",
    uri: 'https://archive.org/download/tranz060TaleTwist-WryWay/03.TaleTwist-Km001.mp3',
    durationSeconds: 160,
    mood: 'Dreamy',
    licence: 'CC-BY',
    attribution: "Km 001 by Tale Twist (CC BY), via the Internet Archive",
    sourceUrl: 'https://archive.org/details/tranz060TaleTwist-WryWay',
  },
  {
    id: 'ia-sputnikrecords010-818330',
    title: "Good morning mr. Moore",
    artist: "Railway dog",
    uri: 'https://archive.org/download/SPUTNIKRECORDS010/22-GoodMorningMr.Moore.mp3',
    durationSeconds: 207,
    mood: 'Warm',
    licence: 'CC0',
    sourceUrl: 'https://archive.org/details/SPUTNIKRECORDS010',
  },
  {
    id: 'ia-gt417mxbxcx-triesspokenword-218d44',
    title: "Extinquish this Flame",
    artist: "Matt Builds Character",
    uri: 'https://archive.org/download/gt417Mxbxcx-...triesSpokenWord/2.ExtinquishThisFlame.mp3',
    durationSeconds: 193,
    mood: 'Warm',
    licence: 'CC0',
    sourceUrl: 'https://archive.org/details/gt417Mxbxcx-...triesSpokenWord',
  },
  {
    id: 'ia-elevatormusic-10e13d',
    title: "elevatormusic",
    artist: "Digi Hartatak",
    uri: 'https://archive.org/download/elevatormusic/elevatormusic.mp3',
    durationSeconds: 178,
    mood: 'Upbeat',
    licence: 'CC-BY',
    attribution: "elevatormusic by Digi Hartatak (CC BY), via the Internet Archive",
    sourceUrl: 'https://archive.org/details/elevatormusic',
  },
  {
    id: 'ia-ps-acidplanetcollection-a96756',
    title: "Breath Out (FrouFrou Remix)",
    artist: "Tobias Peterson",
    uri: 'https://archive.org/download/PS-ACIDplanetCollection/BreathOut-FrouFrouRemix_64kb.mp3',
    durationSeconds: 384,
    mood: 'Upbeat',
    licence: 'CC-BY',
    attribution: "Breath Out (FrouFrou Remix) by Tobias Peterson (CC BY), via the Internet Archive",
    sourceUrl: 'https://archive.org/details/PS-ACIDplanetCollection',
  },
  {
    id: 'ia-tou255-f874b3',
    title: "House Trancefusion (Beat Doctor remix)",
    artist: "Risey",
    uri: 'https://archive.org/download/tou255/tou255b_64kb.mp3',
    durationSeconds: 389,
    mood: 'Energetic',
    licence: 'CC-BY',
    attribution: "House Trancefusion (Beat Doctor remix) by Risey (CC BY), via the Internet Archive",
    sourceUrl: 'https://archive.org/details/tou255',
  },
  {
    id: 'ia-tou252-51abfc',
    title: "Force Of Nature (original mix)",
    artist: "Redmann",
    uri: 'https://archive.org/download/tou252/tou252c_64kb.mp3',
    durationSeconds: 333,
    mood: 'Energetic',
    licence: 'CC-BY',
    attribution: "Force Of Nature (original mix) by Redmann (CC BY), via the Internet Archive",
    sourceUrl: 'https://archive.org/details/tou252',
  },
  {
    id: 'ia-pcfree-5414a2',
    title: "PCFree",
    artist: "Deadman & Digi Hartatak",
    uri: 'https://archive.org/download/pcfree/13__PCFree_64kb.mp3',
    durationSeconds: 341,
    mood: 'Focused',
    licence: 'CC-BY',
    attribution: "PCFree by Deadman & Digi Hartatak (CC BY), via the Internet Archive",
    sourceUrl: 'https://archive.org/details/pcfree',
  },
  {
    id: 'ia-shaggyhaggard-anthem-201411-1ee96f',
    title: "Anthem",
    artist: "Shaggy Haggard",
    uri: 'https://archive.org/download/ShaggyHaggard-Anthem_201411/03%20-%20Anthem.mp3',
    durationSeconds: 157,
    mood: 'Focused',
    licence: 'CC-BY',
    attribution: "Anthem by Shaggy Haggard (CC BY), via the Internet Archive",
    sourceUrl: 'https://archive.org/details/ShaggyHaggard-Anthem_201411',
  },
  {
    id: 'ia-chenard-walcker-sweet-kali-breathe-19bc0b',
    title: "Bolly Baby",
    artist: "Chenard Walcker",
    uri: 'https://archive.org/download/chenard_walcker-sweet_kali_breathe/03-chenard_walcker-bolly_baby.mp3',
    durationSeconds: 166,
    mood: 'Playful',
    licence: 'CC-BY',
    attribution: "Bolly Baby by Chenard Walcker (CC BY), via the Internet Archive",
    sourceUrl: 'https://archive.org/details/chenard_walcker-sweet_kali_breathe',
  },
  {
    id: 'ia-j-me-the-nameless-e2168b',
    title: "thenameless",
    artist: "MC J-Me",
    uri: 'https://archive.org/download/j_me_the_nameless/thenameless_64kb.mp3',
    durationSeconds: 316,
    mood: 'Playful',
    licence: 'CC-BY',
    attribution: "thenameless by MC J-Me (CC BY), via the Internet Archive",
    sourceUrl: 'https://archive.org/details/j_me_the_nameless',
  },
];
