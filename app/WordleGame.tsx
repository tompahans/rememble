"use client";

import React, { useState, useEffect, useRef } from "react";

type History = {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
  lastStatus: "won" | "lost" | null;
  lastGuess?: string;
};

const DEFAULT_HISTORY: History = {
  played: 0,
  won: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDate: null,
  lastStatus: null,
};

type GameStatus = "idle" | "playing" | "won" | "lost";
type LetterStatus = "correct" | "present" | "absent" | "empty" | "filled";

type Props = {
  targetWord: string;
  dateString: string;
};

export default function WordleGame({ targetWord, dateString }: Props) {
  const [history, setHistory] = useState<History>(DEFAULT_HISTORY);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [timeLeft, setTimeLeft] = useState(60);
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("wordle-speedy-history");
    if (stored) {
      try {
        const parsed: History = JSON.parse(stored);
        setHistory(parsed);
        if (parsed.lastPlayedDate === dateString && parsed.lastStatus) {
          setStatus(parsed.lastStatus);
          if (parsed.lastGuess) {
            setInputVal(parsed.lastGuess);
          } else if (parsed.lastStatus === "won") {
            setInputVal(targetWord);
          }
        }
      } catch (e) {
        console.error("Failed to parse history.");
      }
    }
    setHistoryLoaded(true);
  }, [dateString]);

  useEffect(() => {
    if (historyLoaded) {
      localStorage.setItem("wordle-speedy-history", JSON.stringify(history));
    }
  }, [history, historyLoaded]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === "playing" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (status === "playing" && timeLeft === 0) {
      handleGameOver(false);
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  useEffect(() => {
    if (status === "playing") {
      inputRef.current?.focus();
    }
  }, [status]);

  const startGame = () => {
    setStatus("playing");
    setTimeLeft(60);
    setInputVal("");
  };

  const handleGameOver = (isWin: boolean) => {
    setStatus(isWin ? "won" : "lost");
    setHistory((prev) => {
      const newPlayed = prev.played + 1;
      const newWon = prev.won + (isWin ? 1 : 0);
      const newStreak = isWin ? prev.currentStreak + 1 : 0;
      const newMaxStreak = Math.max(prev.maxStreak, newStreak);
      return {
        played: newPlayed,
        won: newWon,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        lastPlayedDate: dateString,
        lastStatus: isWin ? "won" : "lost",
        lastGuess: inputVal,
      };
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (status !== "playing") return;

      // Check if input matches target word precisely
      if (inputVal.length !== targetWord.length) {
        // Wordle shakes the row if it's too short, but here we'll just ignore submit
        // unless user runs out of time.
        return;
      }

      const isWin = inputVal.toLowerCase() === targetWord.toLowerCase();
      handleGameOver(isWin);
    }
  };

  const clearHistory = () => {
    setHistory(DEFAULT_HISTORY);
    setStatus("idle");
    setTimeLeft(60);
    setInputVal("");
    localStorage.removeItem("wordle-speedy-history");
  };

  const evaluateGuess = (guess: string, target: string): LetterStatus[] => {
    const result: LetterStatus[] = Array(target.length).fill("absent");
    const targetChars = target.toLowerCase().split("");
    const guessChars = guess.toLowerCase().padEnd(target.length, " ").split("");

    for (let i = 0; i < target.length; i++) {
      if (guessChars[i] === targetChars[i]) {
        result[i] = "correct";
        targetChars[i] = null as any;
        guessChars[i] = null as any;
      }
    }
    for (let i = 0; i < target.length; i++) {
      if (guessChars[i] !== null) {
        const matchIndex = targetChars.indexOf(guessChars[i]);
        if (matchIndex !== -1) {
          result[i] = "present";
          targetChars[matchIndex] = null as any;
        }
      }
    }
    return result;
  };

  const getBoxes = () => {
    const boxes = [];
    const evaluation = (status === "won" || status === "lost")
      ? evaluateGuess(inputVal, targetWord)
      : Array(targetWord.length).fill("empty");

    for (let i = 0; i < targetWord.length; i++) {
      let letter = inputVal[i] || "";
      let statusClass = "border-[#3a3a3c] bg-transparent text-white"; // empty dark theme Wordle

      if (status === "playing") {
        if (letter) {
          statusClass = "border-[#565758] bg-transparent text-white"; // filled dark
        }
        // Active box border highlight
        if (i === inputVal.length) {
          statusClass = "border-neutral-300 bg-transparent text-white scale-[1.05] transition-transform"; // current
        }
      } else if (status === "lost") {
        letter = targetWord[i] || "";
        statusClass = "bg-[#121213] border-red-500 text-red-500"; // failed style
      } else {
        const evalStatus = evaluation[i];
        if (evalStatus === "correct") statusClass = "bg-[#538d4e] border-[#538d4e] text-white";
        else if (evalStatus === "present") statusClass = "bg-[#b59f3b] border-[#b59f3b] text-white";
        else if (evalStatus === "absent") statusClass = "bg-[#3a3a3c] border-[#3a3a3c] text-white";
      }

      boxes.push(
        <div
          key={i}
          className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-4xl font-bold uppercase transition-all duration-300 border-2 ${statusClass}`}
        >
          {letter}
        </div>
      );
    }
    return boxes;
  };

  if (!historyLoaded) {
    return <div className="min-h-screen text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      {/* Wordle Header */}
      <header className="w-full border-b border-[#3a3a3c] pb-3 mb-8 flex justify-between items-center px-4">
        <div className="w-16"></div> {/* Spacer */}
        <h1 className="flex gap-1 sm:gap-1.5 select-none cursor-default" style={{ fontFamily: "Arial, sans-serif" }}>
          {"REMEMBLE".split("").map((char, i) => {
            const offsets = [
              "",
              "-translate-y-2",
              "translate-y-1",
              "-translate-y-1",
              "-translate-y-3",
              "translate-y-1.5",
              "-translate-y-1",
              "",
            ];
            return (
              <div
                key={i}
                className={`w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-lg sm:text-xl font-extrabold text-white bg-[#121213] border-2 border-[#818384] ${offsets[i]} transition-transform`}
              >
                {char}
              </div>
            );
          })}
        </h1>
        <div className="w-16 text-neutral-400 text-xs text-right mt-2">{dateString.split('-').slice(1).join('/')}</div>
      </header>

      {status === "idle" && (
        <div className="flex flex-col items-center animate-in fade-in duration-300 w-full px-4 mt-8">
          <p className="text-neutral-300 mb-8 text-center text-lg max-w-sm">
            Type yesterday's Wordle word in <strong>60 seconds</strong>.
          </p>
          <button
            onClick={startGame}
            className="w-full max-w-[200px] py-3 rounded-full bg-white text-black font-bold text-lg hover:scale-105 active:scale-95 transition-transform"
          >
            Play
          </button>
        </div>
      )}

      {status === "playing" && (
        <div className="flex flex-col items-center w-full animate-in fade-in duration-300 mt-4">
          <div className={`text-5xl font-bold mb-10 tabular-nums ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            0:{timeLeft.toString().padStart(2, '0')}
          </div>

          <div className="relative mb-2">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => {
                const val = e.target.value.replace(/[^A-Za-z]/g, "");
                if (val.length <= targetWord.length) setInputVal(val);
              }}
              onKeyDown={handleKeyDown}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              autoFocus
              autoComplete="off"
              spellCheck="false"
            />

            <div
              className="flex gap-2 cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              {getBoxes()}
            </div>
          </div>

          <p className="mt-8 text-neutral-500 text-sm">Type to fill, press ENTER to guess.</p>
        </div>
      )}

      {(status === "won" || status === "lost") && (
        <div className="flex flex-col items-center w-full animate-in slide-in-from-bottom-4 duration-500 mt-4">
          <div className="flex gap-2 mb-8">
            {getBoxes()}
          </div>

          <div className="text-center mb-10">
            <h2 className={`text-2xl font-bold mb-1 ${status === "won" ? "text-[#538d4e]" : "text-red-500"}`}>
              {status === "won" ? "Genius!" : "Wrong!"}
            </h2>
          </div>

          {/* Wordle Statistics */}
          <div className="w-full max-w-xs mb-10 mt-4">
            <h3 className="uppercase text-white font-bold text-center mb-4 tracking-wider text-sm">Statistics</h3>
            <div className="flex justify-between text-center gap-2">
              <div className="flex flex-col w-1/4">
                <div className="text-3xl font-normal text-white">{history.played}</div>
                <div className="text-[10px] text-white">Played</div>
              </div>
              <div className="flex flex-col w-1/4">
                <div className="text-3xl font-normal text-white">
                  {history.played > 0 ? Math.round((history.won / history.played) * 100) : 0}
                </div>
                <div className="text-[10px] text-white">Win %</div>
              </div>
              <div className="flex flex-col w-1/4">
                <div className="text-3xl font-normal text-white">{history.currentStreak}</div>
                <div className="text-[10px] text-white">Current<br />Streak</div>
              </div>
              <div className="flex flex-col w-1/4">
                <div className="text-3xl font-normal text-white">{history.maxStreak}</div>
                <div className="text-[10px] text-white">Max<br />Streak</div>
              </div>
            </div>
          </div>

          <button
            onClick={clearHistory}
            className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors uppercase font-bold tracking-wider"
          >
            Reset Stats
          </button>
        </div>
      )}
    </div>
  );
}
