import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

/** The web app's answer sounds. They mix with other audio and respect the silent switch. */
const SOURCES = {
  correct: require("../../assets/sounds/correct-answer.mp3"),
  wrong: require("../../assets/sounds/wrong-answer.mp3"),
};

let players: Record<keyof typeof SOURCES, AudioPlayer> | null = null;

export const preloadSounds = () => {
  if (players) return;
  void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});
  players = { correct: createAudioPlayer(SOURCES.correct), wrong: createAudioPlayer(SOURCES.wrong) };
  players.correct.volume = 0.5;
  players.wrong.volume = 0.45;
};

export const playSound = (name: keyof typeof SOURCES) => {
  preloadSounds();
  const p = players![name];
  p.seekTo(0).then(() => p.play()).catch(() => {});
};
