import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css'

const ANSWER_LENGTH = 5;
const ROUNDS = 6;

type Letter = {
  letter: string
  correct: Correctness
}

enum Correctness {
  None,
  Correct,
  Incorrect,
  Close,
  Invalid
}

function App() {
  const [word, setWord] = useState('HELLO')
  const [currentRow, setCurrentRow] = useState(0)
  const [pastGuesses, setPastGuesses] = useState<Letter[]>([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [done, setDone] = useState(false)
  const [win, setWin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [markInvalid, setMarkInvalid] = useState(false)
  const [letters, setLetters] = useState<Letter[]>([])

  useEffect(() => {
    const initWord = async () => {
      try {
        setIsLoading(true)
        const { word } = await loadWord();
        setWord(word)
        setIsLoading(false)
      } catch (error) {
        setIsLoading(false)
        console.error(error);
      }
    }
    initWord();
  }, [])

  const addLetter = useCallback((letter: string) => {
    if (currentGuess.length < ANSWER_LENGTH) {
      setCurrentGuess(currentGuess + letter)
    } else {
      setCurrentGuess(currentGuess.slice(0, ANSWER_LENGTH - 1) + letter)
    }
  }, [currentGuess])

  const commitGuess = useCallback(async () => {
    if (currentGuess.length !== ANSWER_LENGTH || currentRow >= ROUNDS) {
      return
    }

    try {
      setIsLoading(true)
      setMarkInvalid(false)
      const isValid = await vaidateWord(currentGuess)
      setIsLoading(false)
      if (!isValid) {
        setMarkInvalid(true)
        return
      }

      if (currentGuess === word) {
        const guessResult = currentGuess.split('').map(letter => ({ letter, correct: Correctness.Correct }))
        setPastGuesses(pastGuesses.slice().concat(guessResult))
        setCurrentGuess('')
        setCurrentRow(currentRow + 1)
        alert('You win!')
        setDone(true)
        setWin(true)
        return
      }

      const guessParts = currentGuess.split('')
      const wordParts = word.split('')
      let map = makeMap(wordParts)
      let guessResult: Letter[] = []
      for (let i = 0; i < ANSWER_LENGTH; i++) {
        if (guessParts[i] === wordParts[i]) {
          guessResult.push({ letter: guessParts[i], correct: Correctness.Correct })
          map[guessParts[i]]--;
        } else if (map[guessParts[i]] && map[guessParts[i]] > 0) {
          guessResult.push({ letter: guessParts[i], correct: Correctness.Close })
          map[guessParts[i]]--;
        } else {
          guessResult.push({ letter: guessParts[i], correct: Correctness.Incorrect })
        }
      }
      setPastGuesses(pastGuesses.slice().concat(guessResult))
      setCurrentGuess('')
      setCurrentRow(currentRow + 1)

      console.log(currentRow)
      
      

    } catch (error) {
      setIsLoading(false)
      console.error(error)
      return
    }

  }, [currentGuess, pastGuesses, currentRow, word])

  useEffect(() => { 
    if (currentRow === ROUNDS) {
      setDone(true)
      alert(`you lose, the word was ${word}`)
    }
  }, [currentRow])

  const deleteLetter = useCallback(() => {
    return setCurrentGuess(currentGuess.slice(0, -1))
  }, [currentGuess])

  useEffect(() => {
    if (currentRow >= ROUNDS) {
      return
    }
    if (markInvalid) {
      setMarkInvalid(false)
      const guessParts = currentGuess.split('')
      const guess = guessParts.map(letter => ({ letter, correct: Correctness.None }))
      setLetters([...pastGuesses, ...guess, ...fillRow(currentRow)])
      setTimeout(() => {
        const guess = guessParts.map(letter => ({ letter, correct: Correctness.Invalid }))
        setLetters([...pastGuesses, ...guess, ...fillRow(currentRow)])
      }, 10)
      return
    }
    const guess: Letter[] = currentGuess.split('').map(letter => ({ 
      letter, 
      correct: Correctness.None
    }))
    if (guess.length < ANSWER_LENGTH) {
      for (let i = guess.length; i < ANSWER_LENGTH; i++) {
        guess.push({ letter: '', correct: Correctness.None })
      }
    }
    setLetters([...pastGuesses, ...guess, ...fillRow(currentRow)])
  }, [pastGuesses, currentGuess, currentRow, markInvalid])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (done || isLoading) {
        return
      }

      const action = event.key;

      switch (action) {
        case 'Enter':
          commitGuess()
          break
        case 'Backspace':
          deleteLetter()
          break
        default:
          if (isLetter(action)) {
            addLetter(action.toUpperCase())
          }
          break
      }
    }
    
    window.addEventListener("keydown", onKeyDown)
    
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [done, addLetter, commitGuess])

  return (
    <>
      <Header isDone={done} isWinning={win} />
      <Loading isLoading={isLoading}/>
      <ScoreBoardLetter letters={letters} />
    </>
  )
}

interface HeaderProps {
  isDone: boolean
  isWinning: boolean
}

function Header({ isDone, isWinning }: HeaderProps) {
  let classes = 'brand'
  if (isDone && isWinning) {
    classes += ' winner'
  }
  return (
    <header className="navbar">
      <h1 className={classes}>Word Masters</h1>
    </header>
  )
}

interface LoadingProps {
  isLoading: boolean
}

function Loading({ isLoading }: LoadingProps) {
  return (
    <div className="info-bar">
      <div className={`spiral ${isLoading ? '' : 'hidden'}`}>🌀</div>
    </div>
  )
}

interface ScoreBoardLetterProps {
  letters: Letter[]
}

function ScoreBoardLetter({ letters }: ScoreBoardLetterProps) {
  return (
    <div className="scoreboard">
        { 
          letters.map(({ letter, correct }, index) => {
            let classes = 'scoreboard-letter'
            switch (correct) {
              case Correctness.Correct:
                classes += ' correct'
                break
              case Correctness.Incorrect:
                classes += ' wrong'
                break  
              case Correctness.Close:
                classes += ' close'
                break
              case Correctness.Invalid:
                classes += ' invalid'
                break
              case Correctness.None:
                break
            }
            return <div key={index} className={classes} id={`letter-${index}`}>{letter}</div>
          })
        }
      </div>
    )
}

function fillRow(currentRow: number): Letter[] {
  let rows = []
  for (let i = currentRow + 1; i < ROUNDS; i++) {
    rows.push(makeRow())
  }
  return rows.flat()
}

function makeRow() {
  let letters: Letter[] = []
  for (let i = 0; i < ANSWER_LENGTH; i++) {
    letters.push({ letter: '', correct: Correctness.None })
  }
  return letters
}

async function loadWord() {
  try {
    const res = await fetch("https://words.dev-apis.com/word-of-the-day")
    const { word: wordRes } = await res.json() 
    const word = wordRes.toUpperCase()
    const wordParts = word.split("")
    return { word, wordParts }
  } catch {
    throw new Error("Failed to load word of the day")
  }
}

async function vaidateWord(word: string): Promise<boolean> {
  try {
    const res = await fetch("https://words.dev-apis.com/validate-word", {
      method: "POST",
      body: JSON.stringify({ word }),
    });
    const { validWord } = await res.json();
    return validWord
  } catch {
    throw new Error("Failed to validate word")
  }
}

// a little function to check to see if a character is alphabet letter
// this uses regex (the /[a-zA-Z]/ part) but don't worry about it
// you can learn that later and don't need it too frequently
function isLetter(letter: string) {
  return /^[a-zA-Z]$/.test(letter);
}

// takes an array of letters (like ['E', 'L', 'I', 'T', 'E']) and creates
// an object out of it (like {E: 2, L: 1, T: 1}) so we can use that to
// make sure we get the correct amount of letters marked close instead
// of just wrong or correct
function makeMap(array: string[]) {
  const obj: { [key: string]: number } = {};
  for (let i = 0; i < array.length; i++) {
    if (obj[array[i]]) {
      obj[array[i]]++;
    } else {
      obj[array[i]] = 1;
    }
  }
  return obj;
}

export default App
