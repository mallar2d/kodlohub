import Magic8BallClient from "./Magic8BallClient";

export default function Magic8BallPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB TOOLS</p>
        <h1 className="heading-section mb-8">8-BALL</h1>
        <Magic8BallClient />
      </div>
    </main>
  );
}
