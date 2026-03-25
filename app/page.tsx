import WordleGame from "./WordleGame";

export const revalidate = 3600;

export default async function Home() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateString = yesterday.toISOString().split("T")[0];

  let targetWord = "error";
  try {
    const res = await fetch(
      `https://www.nytimes.com/svc/wordle/v2/${dateString}.json`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      targetWord = data.solution;
    }
  } catch (err) {
    console.error("Failed to fetch word:", err);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      <WordleGame targetWord={targetWord} dateString={dateString} />
    </main>
  );
}
